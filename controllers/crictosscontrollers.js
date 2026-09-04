import db from "../config/db.js";
import moment from "moment-timezone";
import { DateTime } from "luxon";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { messaging } from "../config/firebase.js";

const createUser = async (req, res) => {
    let connection;
    try {
        connection = await db.connect();
        const { id, firstname, middlename, lastname, selectlogintype, emailid, passoword, confirmpassoword, mobileno } = req.body
        if (!firstname) {
            return res.status(500).send({
                success: false,
                message: 'Please enter first name'
            })
        } else if (!lastname) {
            return res.status(500).send({
                success: false,
                message: 'Please enter last name'
            })
        } else if (!selectlogintype) {
            return res.status(500).send({
                success: false,
                message: 'Please select selectlogintype'
            })
        } else if (!emailid) {
            return res.status(500).send({
                success: false,
                message: 'Please enter emailid'
            })
        } else if (!passoword) {
            return res.status(500).send({
                success: false,
                message: 'Please enter passoword'
            })
        } else if (!confirmpassoword) {
            return res.status(500).send({
                success: false,
                message: 'Please enter confirm password'
            })
        } else if (!mobileno) {
            return res.status(500).send({
                success: false,
                message: 'Please enter mobileno'
            })
        } if (passoword !== confirmpassoword) {
            return res.status(400).send({
                success: false,
                message: "Password and Confirm Password must match"
            });
        }

        await connection.query("BEGIN");

        const { rows: tblusertype } = await connection.query(
            "SELECT * FROM tblusertype WHERE id = $1",
            [selectlogintype]
        );


        let newLoginID = null
        let newLoginType = null

        if (tblusertype.length > 0) {
            newLoginType = tblusertype[0].usertype;
            newLoginID = tblusertype[0].id;
        } else {
            await connection.query("ROLLBACK");
            return res.status(500).send({
                success: false,
                message: 'Not available any login type'
            })
        }

        // ✅ Check mobile exists
        const { rows: existingMobile } = await connection.query(
            "SELECT * FROM tabregistration WHERE mobileno = $1",
            [mobileno]
        );

        if (existingMobile.length > 0) {
            await connection.query("ROLLBACK");
            return res.status(400).send({
                success: false,
                message: "Mobile number already exists"
            });
        }

        // ✅ Check email exists
        const { rows: existingEmailid } = await connection.query(
            "SELECT * FROM tabregistration WHERE emailid = $1",
            [emailid]
        );

        if (existingEmailid.length > 0) {
            await connection.query("ROLLBACK");
            return res.status(400).send({
                success: false,
                message: "Email ID already exists"
            });
        }


        const formattedDate = getIndianDateTime();


        await connection.query(
            `INSERT INTO tabregistration ( firstname , middlename, lastname,
            logintype,  emailid,
             password, mobileno, createdate,  
             updateddate, logintypeid )  
            VALUES ($1, $2, $3,
             $4, $5, $6,
              $7, $8, $9, 
              $10)`,
            [firstname, middlename, lastname,
                newLoginType, emailid,
                passoword, mobileno, formattedDate,
                null, newLoginID]);

        await connection.query("COMMIT");

        res.set('Cache-Control', 'no-store');
        res.status(202).send({
            success: true,
            message: 'Successfully user created.'
        })
    } catch (error) {
        if (connection) {
            try {
                await connection.query("ROLLBACK");
            } catch (e) { }
        }
        res.status(500).send({
            success: false,
            message: 'Error in create student API',
            error
        })
    } finally {
        if (connection) connection.release();
    }
}


const getAllUsers = async (req, res) => {
    try {

        const { rows: data } = await db.query("SELECT * FROM tabregistration")

        // data will always be an array, so check its length
        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Users Available',
                data: []
            });
        }


        res.status(200).send({
            success: true,
            message: 'Success.',
            data: data,
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in get all series type API',
            error
        })
    }
}

const login = async (req, res) => {
    try {

        const { mobileno, password } = req.body;

        if (!mobileno) {
            return res.status(404).send({
                success: false,
                message: 'Please enter mobile number',
            })
        } else if (!password) {
            return res.status(404).send({
                success: false,
                message: 'Please enter password',
            })
        }




        const { rows } = await db.query(
            'SELECT * FROM tabregistration WHERE mobileno = $1 AND password = $2',
            [mobileno, password]
        );


        if (rows.length > 0) {
            const user = rows[0]; // get the first (and only) user

            const versionResult = await db.query(
                `UPDATE tabregistration
     SET token_version = COALESCE(token_version, 0) + 1
     WHERE id = $1
     RETURNING token_version`,
                [user.id]
            );


            if (!versionResult.rows || versionResult.rows.length === 0) {
                return res.status(500).send({
                    success: false,
                    message: "Unable to update token version"
                });
            }

            const newTokenVersion = versionResult.rows[0].token_version;


            const token = jwt.sign(
                {
                    type: "USER",
                    id: user.id,
                    tokenVersion: newTokenVersion
                },
                process.env.JWT_SECRET || "crictoss_super_secret_jwt_key_2026",
                {
                    expiresIn: "7D"
                }
            );

            return res.status(200).send({

                success: true,
                message: 'Successfully Logged In.',
                token: token,
                data: {
                    user_id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    logintype: user.logintype,
                    emailid: user.emailid,
                    mobileno: user.mobileno,

                }
            });
        } else {
            return res.status(200).send({
                success: false,
                message: 'Invalid Username and Password'
            });
        }

    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in login API',
            error
        })
    }
}
const saveFcmToken = async (req, res) => {

    try {

        const {
            fcmToken,
            userType,
            userId,
            guestId
        } = req.body;

        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                message: "FCM token is required"
            });
        }

        if (!userType) {
            return res.status(400).json({
                success: false,
                message: "userType is required"
            });
        }

        if (!["GUEST", "USER"].includes(userType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid userType"
            });
        }

        console.log("userType", userType)

        // =========================
        // GUEST
        // =========================

        if (userType === "GUEST") {

            if (!guestId) {
                return res.status(400).json({
                    success: false,
                    message: "guestId is required"
                });
            }

            const query = `
                INSERT INTO fcm_tokens
                (
                    fcm_token,
                    user_id,
                    guest_id,
                    user_type,
                    device_type,
                    is_active,
                    updated_at
                )
                VALUES
                (
                    $1,
                    NULL,
                    $2,
                    'GUEST',
                    'ANDROID',
                    true,
                    CURRENT_TIMESTAMP
                )

                ON CONFLICT (fcm_token)
                DO UPDATE SET
                    user_id = NULL,
                    guest_id = EXCLUDED.guest_id,
                    user_type = 'GUEST',
                    is_active = true,
                    updated_at = CURRENT_TIMESTAMP

                RETURNING *
            `;

            const result = await db.query(
                query,
                [
                    fcmToken,
                    guestId
                ]
            );

            return res.status(200).json({
                success: true,
                message: "Guest FCM token saved",
                data: result.rows[0]
            });
        }


        // =========================
        // USER
        // =========================


        if (userType === "USER") {

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "userId is required"
                });
            }

            const query = `
                INSERT INTO fcm_tokens
                (
                    fcm_token,
                    user_id,
                    guest_id,
                    user_type,
                    device_type,
                    is_active,
                    updated_at
                )
                VALUES
                (
                    $1,
                    $2,
                    NULL,
                    'USER',
                    'ANDROID',
                    true,
                    CURRENT_TIMESTAMP
                )

                ON CONFLICT (fcm_token)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    guest_id = NULL,
                    user_type = 'USER',
                    is_active = true,
                    updated_at = CURRENT_TIMESTAMP

                RETURNING *
            `;

            const result = await db.query(
                query,
                [
                    fcmToken,
                    userId
                ]
            );

            return res.status(200).json({
                success: true,
                message: "User FCM token saved",
                data: result.rows[0]
            });
        }

    } catch (error) {



        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const dashboard = async (req, res) => {
    try {

        // =====================================
        // GUEST USER
        // =====================================

        if (req.user.type === "GUEST") {

            return res.status(200).send({
                success: true,
                message: "Guest dashboard data",
                userType: "GUEST",
                data: {
                    user_id: null,
                    firstname: "Guest",
                    lastname: "",
                    logintype: "GUEST",
                    emailid: "",
                    mobileno: ""
                }
            });
        }



        const { id } = req.body;

        if (!id) {

            return res.status(200).send({
                success: false,
                message: 'Data Not Load'
            });
        }


        const { rows } = await db.query(
            'SELECT * FROM tabregistration WHERE id = $1',
            [id]
        );

        if (rows.length > 0) {
            const user = rows[0]; // get the first (and only) user
            return res.status(200).send({

                success: true,
                message: 'Successfully Logged In.',
                userType: "USER",
                data: {
                    user_id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    logintype: user.logintype,
                    emailid: user.emailid,
                    mobileno: user.mobileno,
                }
            });
        } else {
            return res.status(200).send({
                success: false,
                message: 'User not found'
            });
        }

    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in dashboard API',
            error
        })
    }
}



const createGuestToken = async (req, res) => {
    try {
        const guestId = crypto.randomUUID();
        const jwtSecret = process.env.JWT_SECRET || "crictoss_super_secret_jwt_key_2026";

        const token = jwt.sign(
            {
                type: "GUEST",
                guestId: guestId
            },
            jwtSecret,
            {
                expiresIn: "7D"
            }
        );

        console.log(token);

        return res.status(200).json({
            success: true,
            message: "Guest token generated successfully",
            token: token,
            data: {
                guestId: guestId,
                type: "GUEST"
            }
        });

    } catch (error) {
        console.error("Guest Token Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error generating guest token",
            error: error.message || error
        });
    }
};

function getIndianDateTime() {
    const now = new Date();

    // Convert to India time zone
    const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    // Format: YYYY-MM-DD HH:mm:ss
    const year = indiaTime.getFullYear();
    const month = String(indiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(indiaTime.getDate()).padStart(2, '0');
    const hours = String(indiaTime.getHours()).padStart(2, '0');
    const minutes = String(indiaTime.getMinutes()).padStart(2, '0');
    const seconds = String(indiaTime.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


// SET AND GET USER TYPE

const Usertype = async (req, res) => {
    try {
        const { usertype } = req.body
        if (!usertype) {
            return res.status(500).send({
                success: false,
                message: 'Please enter user type'
            })
        }



        const data = await db.query(
            `INSERT INTO tblusertype ( usertype )  VALUES ($1)`,
            [usertype])

        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            })
        }

        res.status(202).send({
            success: true,
            message: 'Successfully Inserted.'
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in create User Type API',
            error
        })
    }
}

// Set Conatct US

const ContactUS = async (req, res) => {
    try {
        const { name, emailid, message } = req.body


        if (!name || !name.trim()) {
            return res.status(400).send({
                success: false,
                message: 'Please enter name'
            });
        }

        if (!emailid || !emailid.trim()) {
            return res.status(400).send({
                success: false,
                message: 'Please enter email'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailid.trim())) {
            return res.status(400).send({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        if (!message || !message.trim()) {
            return res.status(400).send({
                success: false,
                message: 'Please enter message'
            });
        }


        const query = `
    INSERT INTO public."tblContactUS"
    (name, email, message)
    VALUES ($1, $2, $3)
    RETURNING *
`;

        const result = await db.query(query, [
            name,
            emailid,
            message
        ]);

        if (!result) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert queries'
            })
        }

        res.status(202).send({
            success: true,
            message: 'Successfully Inserted.'
        })

    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in Contact US API',
            error
        })
    }
}

const getUsertype = async (req, res) => {
    try {

        const { rows: data } = await db.query(" SELECT * FROM tblusertype")

        // data will always be an array, so check its length
        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Series Type Available',
                data: []
            });
        }


        res.status(200).send({
            success: true,
            message: 'Success.',
            data: data,
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in get all series type API',
            error
        })
    }
}



const insertAds = async (req, res) => {
    try {
        const { bannerads, interstitialsads, native, appopen } = req.body


        const data = await db.query(
            `INSERT INTO tblads ( bannerads, interstitialads, native, appopen )  
            VALUES ($1, $2, $3, $4)`,
            [bannerads, interstitialsads, native, appopen])

        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            })
        }

        res.status(202).send({
            success: true,
            message: 'Successfully Inserted.'
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in create User Type API',
            error
        })
    }
}


const getAllAds = async (req, res) => {
    try {

        const { rows: data } = await db.query(" SELECT * FROM tblads")

        // data will always be an array, so check its length
        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Ads Available',
                data: []
            });
        }


        res.status(200).send({
            success: true,
            message: 'Success.',
            data: data,
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in get all ads API',
            error
        })
    }
}

const deleteUsertype = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const result = await db.query(
            "DELETE FROM tblusertype WHERE id = $1",
            [id]
        );

        console.log("id", id);


        if (result.rowCount === 0) {
            return res.status(404).send({
                success: false,
                message: "Record not found"
            });
        }

        res.status(200).send({
            success: true,
            message: "Record deleted successfully"
        });

    } catch (error) {
        ;
        res.status(500).send({
            success: false,
            message: "Error in delete API",
            error
        });
    }
};



const createteam = async (req, res) => {

    console.log("BODY => ", req.body);

    try {
        const { id, teamname } = req.body

        if (!teamname) {
            return res.status(500).send({
                success: false,
                message: 'Please enter team name'
            })
        }


        const createdTimeUTC = DateTime.utc().toSQL({ includeOffset: false });


        /* =====================================================
           UPDATE (id provided and series exists)
        ===================================================== */

        if (id) {
            const { rows: checkTeam } = await db.query(
                `SELECT id FROM teams WHERE id = $1`,
                [id]
            );

            if (checkTeam.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Team not found"
                });
            }

            await db.query(
                `UPDATE teams
             SET
                teamname = $1,
                updateddate = $2
             WHERE id = $3`,
                [
                    teamname,
                    createdTimeUTC,
                    id
                ]
            );


            return res.status(200).json({
                success: true,
                message: "Successfully Updated"
            });
        }

        /* =====================================================
           INSERT (new series)
        ===================================================== */

        // Check duplicate team name
        const { rows: existingTeam } = await db.query(
            `SELECT id
             FROM teams
             WHERE LOWER(TRIM(teamname)) = LOWER(TRIM($1))`,
            [teamname]
        );

        if (existingTeam.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Team name already exists"
            });
        }

        await db.query(
            `INSERT INTO teams
        (teamname, createddate, updateddate)
         VALUES ($1, $2, $3)`,
            [

                teamname, createdTimeUTC, null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Successfully Inserted New Team"
        });

    } catch (error) {


        return res.status(500).json({
            success: false,
            message: "Error creating bet",
            error: error.message
        });
    }
}



const getteam = async (req, res) => {

    try {

        const { teamname } = req.body;


        let query = "SELECT * FROM teams WHERE 1=1";
        let values = [];



        // Series Type
        if (teamname && teamname.trim() !== "") {
            query += `
                AND teamname ILIKE $${values.length + 1}
            `;

            values.push(`%${teamname.trim()}%`);
        }

        // ORDER 

        // ORDER BY MUST BE LAST
        query += " ORDER BY id ASC";


        const { rows: data } = await db.query(query, values);

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No team Available',
                data: []
            });
        }

        res.status(200).send({
            success: true,
            message: 'Success',
            data: data,
        });





    } catch (error) {
        ;
        res.status(500).send({
            success: false,
            message: "Error in team API",
            error
        });
    }



}


const deleteteam = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const result = await db.query(
            "DELETE FROM teams WHERE id = $1",
            [id]
        );



        if (result.rowCount === 0) {
            return res.status(404).send({
                success: false,
                message: "Record not found"
            });
        }

        res.status(200).send({
            success: true,
            message: "Record deleted successfully"
        });

    } catch (error) {
        ;
        res.status(500).send({
            success: false,
            message: "Error in delete API",
            error
        });
    }
};



// SET AND GET SERIES

const series = async (req, res) => {


    try {
        const { id, seriesname, seriestype, betStartTime, betEndTime, userZone, isNotify } = req.body

        if (!seriesname) {
            return res.status(500).send({
                success: false,
                message: 'Please enter seriesname name'
            })
        } else if (!seriestype) {
            return res.status(500).send({
                success: false,
                message: 'Please select seriestype'
            })
        } else if (!betStartTime) {
            return res.status(500).send({
                success: false,
                message: 'Please select betStartTime'
            })
        } else if (!betEndTime) {
            return res.status(500).send({
                success: false,
                message: 'Please select betEndTime'
            })
        }

        let notify = false;

        if (isNotify !== undefined && isNotify !== null) {

            if (typeof isNotify === "boolean") {
                notify = isNotify;
            }
            else if (isNotify === "true") {
                notify = true;
            }
            else if (isNotify === "false") {
                notify = false;
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: "isNotify must be true or false"
                });
            }
        }


        const zone = userZone || "Asia/Kolkata";



        const formats = [
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss.SSSZ"
        ];

        const betStartUser = moment.tz(betStartTime, formats, zone);
        const betEndUser = moment.tz(betEndTime, formats, zone);

        if (!betStartUser.isValid()) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format OF statdate"
            });
        }

        if (!betEndUser.isValid()) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format enddate"
            });
        }

        const EndUTime = betEndUser.utc().format("YYYY-MM-DD HH:mm:ss");
        const StartTime = betStartUser.utc().format("YYYY-MM-DD HH:mm:ss");

        const betStartUTC = DateTime.utc().toSQL({ includeOffset: false });



        /* =====================================================
           UPDATE (id provided and series exists)
        ===================================================== */

        if (id) {
            const { rows: checkSeries } = await db.query(
                `SELECT id FROM tblseries WHERE id = $1`,
                [id]
            );

            if (checkSeries.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Series not found"
                });
            }

            await db.query(
                `UPDATE tblseries
             SET
                seriesname = $1,
                seriestype = $2,
                betStartTime = $3,
                betEndTime = $4,
                 "isnotify" = $5,
                updated_date = $6

             WHERE id = $7`,
                [
                    seriesname,
                    seriestype,
                    StartTime,
                    EndUTime,
                    notify,
                    betStartUTC,
                    id
                ]
            );

            return res.status(200).json({
                success: true,
                message: "Successfully Updated"
            });
        }

        /* =====================================================
           INSERT (new series)
        ===================================================== */


        await db.query(
            `INSERT INTO tblseries
        (seriesname, seriestype, betStartTime, betEndTime,
         created_date, updated_date,"isnotify")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [

                seriesname, seriestype, StartTime, EndUTime, betStartUTC, null, notify
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Successfully Inserted New Series"
        });

    } catch (error) {


        return res.status(500).json({
            success: false,
            message: "Error creating bet",
            error: error.message
        });
    }
}

const getAllSeries = async (req, res) => {
    try {

        const { seriesid, seriestype } = req.body;


        let query = "SELECT * FROM tblseries WHERE 1=1";
        let values = [];

        // Series ID
        if (seriesid !== undefined &&
            seriesid !== null &&
            seriesid !== "") {
            query += ` AND id = $${values.length + 1}`;
            values.push(seriesid);
        }

        // Series Type
        if (seriestype && seriestype.trim() !== "") {
            query += ` AND TRIM(LOWER(seriestype)) = TRIM(LOWER($${values.length + 1}))`;
            values.push(seriestype);
        }

        // ORDER 

        // ORDER BY MUST BE LAST
        query += " ORDER BY id ASC";



        const { rows: data } = await db.query(query, values);

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Series Available',
                data: []
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Success Get All Seiries.',
            data: data,
        });

    } catch (error) {
        console.error("Error in getAllSeries API:", error);
        return res.status(500).send({
            success: false,
            message: 'Error in get all series API',
            error: error.message || error
        });
    }
}

const deleteAllSeries = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const result = await db.query(
            "DELETE FROM tblseries WHERE id = $1",
            [id]
        );



        if (result.rowCount === 0) {
            return res.status(404).send({
                success: false,
                message: "Record not found"
            });
        }

        res.status(200).send({
            success: true,
            message: "Record deleted successfully"
        });

    } catch (error) {
        ;
        res.status(500).send({
            success: false,
            message: "Error in delete API",
            error
        });
    }
};



// SET AND GET SERIES TYPE

const Seriestype = async (req, res) => {
    try {
        const { seriestype } = req.body
        if (!seriestype) {
            return res.status(500).send({
                success: false,
                message: 'Please enter series type'
            })
        }



        const data = await db.query(
            `INSERT INTO tblseriestype ( seriestype )  VALUES ($1)`,
            [seriestype])

        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            })
        }

        res.status(202).send({
            success: true,
            message: 'Successfully Inserted.'
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in create Login Type API',
            error
        })
    }
}

const getSeriestype = async (req, res) => {
    try {

        const { rows: data } = await db.query(" SELECT * FROM tblseriestype")

        // data will always be an array, so check its length
        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Series Type Available',
                data: []
            });
        }


        res.status(200).send({
            success: true,
            message: 'Success.',
            data: data,
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in get all series type API',
            error
        })
    }
}

const deleteSeriestype = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const result = await db.query(
            "DELETE FROM tblseriestype WHERE id = $1",
            [id]
        );



        if (result.rowCount === 0) {
            return res.status(404).send({
                success: false,
                message: "Record not found"
            });
        }

        res.status(200).send({
            success: true,
            message: "Record deleted successfully"
        });

    } catch (error) {
        ;
        res.status(500).send({
            success: false,
            message: "Error in delete API",
            error
        });
    }
};


// SET AND GET MATCH FORMAT

const MatchFormat = async (req, res) => {
    try {
        const { formatname } = req.body
        if (!formatname) {
            return res.status(500).send({
                success: false,
                message: 'Please enter match format type'
            })
        }



        const data = await db.query(
            `INSERT INTO tblmatchformat ( formatname )  VALUES ($1)`,
            [formatname])

        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            })
        }

        res.status(202).send({
            success: true,
            message: 'Successfully Inserted.'
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in create Login Type API',
            error
        })
    }
}

const getMatchFormat = async (req, res) => {
    try {

        const { rows: data } = await db.query(" SELECT * FROM tblmatchformat")

        // data will always be an array, so check its length
        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Match Format Type Available',
                data: []
            });
        }


        res.status(200).send({
            success: true,
            message: 'Success.',
            data: data,
        })
    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in Get All Student API',
            error
        })
    }
}

const deleteMatchFormat = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const result = await db.query(
            "DELETE FROM tblmatchformat WHERE id = $1",
            [id]
        );



        if (result.rowCount === 0) {
            return res.status(404).send({
                success: false,
                message: "Record not found"
            });
        }

        res.status(200).send({
            success: true,
            message: "Record deleted successfully"
        });

    } catch (error) {
        ;
        res.status(500).send({
            success: false,
            message: "Error delete API",
            error
        });
    }
};


const schedules = async (req, res) => {

    let connection;

    try {
        connection = await db.connect();
        const { id, seriesid,
            matchFormatid, startDate, endDate, matchno, teamid1, teamid2, userZone } = req.body

        if (!seriesid) {
            return res.status(500).send({
                success: false,
                message: 'Please enter seriesid'
            })
        } else if (!matchFormatid) {
            return res.status(500).send({
                success: false,
                message: 'Please select matchFormat'
            })
        } else if (!matchno) {
            return res.status(500).send({
                success: false,
                message: 'Please enter match number namme'
            })
        } else if (!startDate) {
            return res.status(500).send({
                success: false,
                message: 'Please enter startDate'
            })
        } else if (!teamid1) {
            return res.status(500).send({
                success: false,
                message: 'Please select team 1'
            })
        } else if (!teamid2) {
            return res.status(500).send({
                success: false,
                message: 'Please select team 2'
            })
        }


        // Get Series name
        const { rows: seriesdata } = await connection.query(
            "SELECT seriesname, isnotify FROM tblseries WHERE id = $1",
            [seriesid]
        );


        let newSeriesName = null
        let notify = false;
        if (seriesdata.length > 0) {
            newSeriesName = seriesdata[0].seriesname;
            notify = seriesdata[0].isnotify;
        } else {
            return res.status(500).send({
                success: false,
                message: 'Not available any series'
            })
        }



        // Get match format
        const { rows: matchformatdata } = await connection.query(
            "SELECT formatname FROM tblmatchformat WHERE id = $1",
            [matchFormatid]
        );

        let newMatchFormatName = null
        if (matchformatdata.length > 0) {
            newMatchFormatName = matchformatdata[0].formatname
        } else {
            return res.status(500).send({
                success: false,
                message: 'Not available any match format'
            })
        }


        // Team name 1 get 
        const { rows: teamsid1data } = await connection.query(
            "SELECT teamname FROM teams WHERE id = $1",
            [teamid1]
        );

        let newTeam1Name = null
        if (teamsid1data.length > 0) {
            newTeam1Name = teamsid1data[0].teamname;
        } else {
            return res.status(500).send({
                success: false,
                message: 'Not available this team 1 name'
            })
        }

        // Team name 2 get 
        const { rows: teamsid2data } = await connection.query(
            "SELECT teamname FROM teams WHERE id = $1",
            [teamid2]
        );

        let newTeam2Name = null
        if (teamsid2data.length > 0) {
            newTeam2Name = teamsid2data[0].teamname;
        } else {
            return res.status(500).send({
                success: false,
                message: 'Not available this team 2 name'
            })
        }


        const zone = userZone || "Asia/Kolkata";

        const formats = [
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss.SSSZ"
        ];

        const macthstarttime = moment.tz(startDate, formats, zone);

        if (!macthstarttime.isValid()) {
            return res.status(400).json({
                success: false,
                message: "Invalid macth start time format"
            });
        }


        const macthendtime = moment.tz(endDate, formats, zone);

        if (!macthendtime.isValid()) {
            return res.status(400).json({
                success: false,
                message: "Invalid macth end time format"
            });
        }

        if (teamid1 === teamid2) {
            return res.status(400).json({
                success: false,
                message: "Team 1 and Team 2 cannot be the same"
            });
        }

        const StartTime = macthstarttime.utc().format("YYYY-MM-DD HH:mm:ss");
        const EndTime = macthendtime.utc().format("YYYY-MM-DD HH:mm:ss");

        const createdTimeUTC = DateTime.utc().toSQL({ includeOffset: false });

        /* =====================================================
           INSERT
        ===================================================== */

        if (id) {

            // Check record exists
            const { rows: scheduleData } = await connection.query(
                "SELECT id FROM tblschedule WHERE id = $1",
                [id]
            );

            if (scheduleData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Schedule not found"
                });
            }

            await connection.query(
                `UPDATE tblschedule
         SET
            seriesid = $1,
            seriesname = $2,
            matchformatid = $3,
            matchformat = $4,
            startDate = $5,
            endDate = $6,
            teamid1 = $7,   
            teamName1 = $8,
            teamid2 = $9,   
            teamName2 = $10,
            updateddate = $11,
            matchno = $12,
            isnotify = $13
         WHERE id = $14`,
                [
                    seriesid, newSeriesName,
                    matchFormatid, newMatchFormatName,
                    StartTime, EndTime,
                    teamid1, newTeam1Name,
                    teamid2, newTeam2Name,
                    createdTimeUTC, matchno,
                    notify, id
                ]
            );

            return res.status(200).json({
                success: true,
                message: "Schedule updated successfully..."
            });

        } else {

            await connection.query(
                `INSERT INTO tblschedule
        (
            seriesid, seriesname,
            matchformatid,matchFormat,
            startDate,endDate,
            teamid1,teamid2,
            teamName1,teamName2,
            tosswonstatus,tossstatus,
            createddate,updateddate,
            matchno, isnotify
        )
        VALUES
        (
            $1,$2,
            $3,$4,
            $5,$6,
            $7,$8,
            $9,$10,
            $11,$12,
            $13, $14,
            $15, $16
        )`,
                [
                    seriesid, newSeriesName,
                    matchFormatid, newMatchFormatName,
                    StartTime, EndTime,
                    teamid1, teamid2,
                    newTeam1Name, newTeam2Name,
                    null, false,
                    createdTimeUTC, null,
                    matchno, notify
                ]
            );

            return res.status(201).json({
                success: true,
                message: "Successfully Inserted New Match Schedule"
            });
        }

    } catch (error) {


        return res.status(500).json({
            success: false,
            message: "Error creating bet",
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
}




const updateTossStatus = async (req, res) => {

    let connection;

    try {
        connection = await db.connect();

        const { id, teamid, tossdeccide, isAbandoned, abandonReason } = req.body || {};

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Please enter match id"
            });
        }

        await connection.query("BEGIN");

        // ✅ Check if match exists
        const { rows: checkStatus } = await connection.query(
            "SELECT * FROM tblschedule WHERE id = $1",
            [id]
        );

        if (checkStatus.length === 0) {
            await connection.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Match not found"
            });
        }

        const match = checkStatus[0];
        const seriesid = match.seriesid;

        // Check if match is marked as abandoned
        const cleanDecide = (tossdeccide || "").trim().toLowerCase();
        const isMatchAbandoned = isAbandoned === true || isAbandoned === "true" || cleanDecide === "abandoned" || cleanDecide === "abandon" || cleanDecide === "cancelled" || cleanDecide === "no result";

        if (isMatchAbandoned) {
            const abandonStatusText = abandonReason || "Match Abandoned";

            await connection.query(
                `UPDATE tblschedule 
                 SET tosswinnerid = NULL,
                     tosswonstatus = $1,
                     tossstatus = true,
                     updateddate = NOW() AT TIME ZONE 'UTC'
                 WHERE id = $2`,
                [abandonStatusText, id]
            );

            await connection.query("COMMIT");

            await sendGuestTossNotification({
                matchId: id,
                teamId: null,
                seriesId: seriesid,
                message: abandonStatusText
            });

            return res.status(200).json({
                success: true,
                message: "Match marked as abandoned successfully",
                data: {
                    id,
                    isAbandoned: true,
                    tosswonstatus: abandonStatusText
                }
            });
        }

        // Standard Toss Update Flow
        if (!teamid) {
            await connection.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "Please select team name"
            });
        } else if (!tossdeccide) {
            await connection.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "Please select toss decide bat or bowl"
            });
        }

        const { rows: checkTeam } = await db.query(
            `SELECT id FROM teams WHERE id = $1`,
            [teamid]
        );

        if (checkTeam.length === 0) {
            await connection.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Team not found"
            });
        }

        let tossWonTeamName;

        if (Number(teamid) === Number(match.teamid1)) {
            tossWonTeamName = match.teamname1;
        } else if (Number(teamid) === Number(match.teamid2)) {
            tossWonTeamName = match.teamname2;
        } else {
            await connection.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "Invalid toss team for this match"
            });
        }

        const thisteamwon = tossWonTeamName + " won the toss and opt to " + tossdeccide;

        await connection.query(
            `UPDATE tblschedule 
             SET tosswinnerid = $1,
                 tosswonstatus = $2,
                 tossstatus = true,
                 updateddate = NOW() AT TIME ZONE 'UTC'
             WHERE id = $3`,
            [teamid, thisteamwon, id]
        );

        await connection.query("COMMIT");

        console.log("Toss updated successfully for match ID:", id, "Team ID:", teamid, "Toss Decision:", tossdeccide);

        await sendGuestTossNotification({
            matchId: id,
            teamId: teamid,
            seriesId: seriesid,
            message: thisteamwon
        });


        return res.status(200).json({
            success: true,
            message: "Toss updated successfully",
            data: {
                id,
                teamid,
                tossWonTeamName,
                tossdeccide,
                thisteamwon
            }
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.query("ROLLBACK");
            } catch (e) { }
        }
        return res.status(500).send({
            success: false,
            message: 'Error updating toss status',
            error: error.message || error
        });
    } finally {
        if (connection) connection.release();
    }
}

const sendGuestTossNotification = async ({
    matchId,
    teamId,
    seriesId,
    message
}) => {

    const { rows } = await db.query(`
        SELECT fcm_token,
                user_type,
                user_id
        FROM fcm_tokens
        WHERE user_type = 'GUEST'
        AND is_active = true
        AND fcm_token IS NOT NULL
    `);

    const tokens = rows.map(row => row.fcm_token);

    
    console.log("tokens:", tokens);


    if (tokens.length === 0) {
        return;
    }
    console.log("req.user:tokens", tokens);


    const firebaseMessage = {
        notification: {
            title: "Toss Update",
            body: message
        },

        data: {
            type: "TOSS_UPDATE",
            EXTRA_MATCH_ID: String(matchId),
            EXTRA_TEAM_ID: String(teamId),
            EXTRA_SERIES_ID: String(seriesId),
            click_action: "RecordTossActivity"
        },

        android: {
            priority: "high",

            notification: {
                sound: "default"
            }
        },

        tokens: tokens
    };

    if (!messaging) {
        console.warn("Firebase messaging not initialized, skipping notification.");
        return;
    }

    console.log("========== PUSH START ==========");
    console.log("FCM TOKEN:", tokens);

    try {
        const response =
            await messaging.sendEachForMulticast(firebaseMessage);

        console.log("========== FCM SUCCESS ==========");
        console.log(response);



        // Invalid tokens deactivate
        response.responses.forEach(async (result, index) => {

            if (!result.success) {

                const errorCode = result.error?.code;

                if (
                    errorCode ===
                    "messaging/registration-token-not-registered"
                ) {

                    const invalidToken = tokens[index];

                    await db.query(`
                    UPDATE fcm_tokens
                    SET is_active = false,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fcm_token = $1
                `, [invalidToken]);

                }
            }
        });
    } catch (error) {
        console.error("========== FCM ERROR ==========");
        console.error("CODE:", error.code);
        console.error("MESSAGE:", error.message);
    }


};

const getSchedule = async (req, res) => {
    try {

        const { id, seriesid, matchFormat, seriesname, teamName1, teamName2 } = req.body;

        // दोनों handle (typo + correct)
        const format = matchFormat;


        let query = "SELECT * FROM tblschedule WHERE 1=1";
        let values = [];

        // Series ID Filter
        if (id) {
            query += ` AND id = $${values.length + 1}`;
            values.push(id);
        }

        // Series ID Filter
        if (seriesid) {
            query += ` AND seriesid = $${values.length + 1}`;
            values.push(seriesid);
        }

        if (format && format.trim() !== "") {
            query += ` AND TRIM(LOWER(matchFormat)) = TRIM(LOWER($${values.length + 1}))`;
            values.push(format);
        }

        if (seriesname && seriesname.trim() !== "") {
            query += ` AND TRIM(LOWER(seriesname)) = TRIM(LOWER($${values.length + 1}))`;
            values.push(seriesname);
        }

        if (teamName1 && teamName1.trim() !== "") {
            query += ` AND TRIM(LOWER(teamName1)) = TRIM(LOWER($${values.length + 1}))`;
            values.push(teamName1);
        }

        if (teamName2 && teamName2.trim() !== "") {
            query += ` AND TRIM(LOWER(teamName2)) = TRIM(LOWER($${values.length + 1}))`;
            values.push(teamName2);
        }

        // ORDER BY MUST BE LAST
        query += " ORDER BY id ASC";

        const { rows: data } = await db.query(query, values);

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Schedules Available',
                data: []
            });
        }

        res.status(200).send({
            success: true,
            message: 'Success',
            data: data,
        });

    } catch (error) {

        res.status(500).send({
            success: false,
            message: 'Error in Get All Student API',
            error
        })
    }
}


const addMatchView = async (req, res) => {
    try {

        const { matchId, guestId } = req.body;

        if (!matchId) {
            return res.status(400).json({
                success: false,
                message: "Match ID is required"
            });
        }

        console.log("req.user:", req.user);

        const scheduleResult = await db.query(
            `SELECT id
             FROM tblschedule
             WHERE id = $1
             LIMIT 1`,
            [matchId]
        );

        if (scheduleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Schedule not found"
            });
        }


        console.log("req.user.type", req.user.type);
        // =====================================
        // LOGIN USER
        // =====================================

        if (req.user && req.user.type === "USER") {

            const userId = req.user.id;

            console.log("Logged in User ID:", userId);

            const existingView = await db.query(
                `SELECT id
                 FROM match_screen_views
                 WHERE match_id = $1
                 AND user_id = $2
                 LIMIT 1`,
                [matchId, userId]
            );

            if (existingView.rows.length > 0) {
                return res.status(200).json({
                    success: true,
                    counted: false,
                    userType: "USER",
                    message: "Already viewed"
                });
            }

            await db.query(
                `INSERT INTO match_screen_views
                    (match_id, user_id)
                 VALUES ($1, $2)`,
                [matchId, userId]
            );

            return res.status(200).json({
                success: true,
                counted: true,
                userType: "USER",
                message: "View counted"
            });
        }

        // =====================================
        // GUEST USER
        // =====================================

        if (!guestId) {
            return res.status(400).json({
                success: false,
                message: "Guest ID is required"
            });
        }

        const existingGuestView = await db.query(
            `SELECT id
             FROM match_screen_views
             WHERE match_id = $1
             AND guest_id = $2
             LIMIT 1`,
            [matchId, guestId]
        );

        if (existingGuestView.rows.length > 0) {
            return res.status(200).json({
                success: true,
                counted: false,
                userType: "GUEST",
                message: "Already viewed"
            });
        }

        await db.query(
            `INSERT INTO match_screen_views
                (match_id, guest_id)
             VALUES ($1, $2)`,
            [matchId, guestId]
        );

        return res.status(200).json({
            success: true,
            counted: true,
            userType: "GUEST",
            message: "View counted"
        });

    } catch (error) {

        console.error("Match View Error:", error);

        return res.status(500).json({
            success: false,
            message: "Error in match view API",
            error: error.message
        });
    }
};

const getScheduleViewCount = async (req, res) => {
    try {

        const { scheduleId } = req.body;

        if (!scheduleId) {
            return res.status(400).json({
                success: false,
                message: "Schedule ID is required"
            });
        }

        // Check schedule exists
        const scheduleResult = await db.query(
            `SELECT id
             FROM tblschedule
             WHERE id = $1
             LIMIT 1`,
            [scheduleId]
        );

        if (scheduleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Schedule not found"
            });
        }

        // Get view counts
        const viewResult = await db.query(
            `SELECT
                COUNT(*)::INTEGER AS total_views,
                COUNT(user_id)::INTEGER AS user_views,
                COUNT(guest_id)::INTEGER AS guest_views
             FROM match_screen_views
             WHERE match_id = $1`,
            [scheduleId]
        );

        const views = viewResult.rows[0];

        return res.status(200).json({
            success: true,
            message: "View count fetched successfully",
            data: {
                scheduleId: Number(scheduleId),
                totalViews: views.total_views,
                userViews: views.user_views,
                guestViews: views.guest_views
            }
        });

    } catch (error) {

        console.error("Get Schedule View Count Error:", error);

        return res.status(500).json({
            success: false,
            message: "Error in get schedule view count API",
            error: error.message
        });
    }
};

const getNext10Matches = async (req, res) => {
    try {
        console.log("Body Data for Next 10 Matches:", req.body);

        const {
            limit = 10,
            upcomingOnly = true
        } = req.body || {};

        const recordLimit = parseInt(limit, 10) || 10;

        let query = "SELECT * FROM tblschedule WHERE 1=1";
        let values = [];



        if (upcomingOnly) {
            query += ` AND startDate >= CURRENT_TIMESTAMP`;
        }

        // ORDER BY startDate ASC, id ASC to get the chronological next matches
        query += ` ORDER BY startDate ASC, id ASC LIMIT $${values.length + 1}`;
        values.push(recordLimit);

        let { rows: data } = await db.query(query, values);

        // Fallback: If no upcoming matches found using CURRENT_TIMESTAMP, fetch the next records by id ASC
        if (data.length === 0 && upcomingOnly && !startDate) {
            let fallbackQuery = "SELECT * FROM tblschedule WHERE 1=1";
            let fallbackValues = [];

            if (seriesid) {
                fallbackQuery += ` AND seriesid = $${fallbackValues.length + 1}`;
                fallbackValues.push(seriesid);
            }
            if (format && format.trim() !== "") {
                fallbackQuery += ` AND TRIM(LOWER(matchFormat)) = TRIM(LOWER($${fallbackValues.length + 1}))`;
                fallbackValues.push(format);
            }

            fallbackQuery += ` ORDER BY id ASC LIMIT $${fallbackValues.length + 1}`;
            fallbackValues.push(recordLimit);

            const fallbackResult = await db.query(fallbackQuery, fallbackValues);
            data = fallbackResult.rows;
        }

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Upcoming Match Records Available',
                data: []
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Successfully fetched next match records',
            count: data.length,
            data: data
        });

    } catch (error) {
        return res.status(500).send({
            success: false,
            message: 'Error in getNext10Matches API',
            error: error.message || error
        });
    }
};

const getUpdatedTossRecords = async (req, res) => {
    try {
        console.log("Body Data for Updated Toss Records:", req.body);

        const {
            page = 1,
            limit = 10,
            seriesid,
            matchFormat,
            seriesname,
            teamid1,
            teamid2
        } = req.body || {};

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const offset = (pageNum - 1) * limitNum;

        let baseQuery = "FROM tblschedule WHERE updateddate IS NOT NULL AND tossstatus = true";
        let values = [];

        // Series ID Filter
        if (seriesid) {
            values.push(seriesid);
            baseQuery += ` AND seriesid = $${values.length}`;
        }

        // Match Format Filter
        if (matchFormat && matchFormat.trim() !== "") {
            values.push(matchFormat);
            baseQuery += ` AND TRIM(LOWER(matchFormat)) = TRIM(LOWER($${values.length}))`;
        }

        // Series Name Filter
        if (seriesname && seriesname.trim() !== "") {
            values.push(seriesname);
            baseQuery += ` AND TRIM(LOWER(seriesname)) = TRIM(LOWER($${values.length}))`;
        }

        // Team 1 Filter
        if (teamid1 !== undefined && teamid1 !== null && teamid1 !== "") {
            values.push(Number(teamid1));
            baseQuery += ` AND teamid1 = $${values.length}`;
        }

        // Team 2 Filter
        if (teamid2 !== undefined && teamid2 !== null && teamid2 !== "") {
            values.push(Number(teamid2));
            baseQuery += ` AND teamid2 = $${values.length}`;
        }

        // Get total count for pagination metadata
        const countQuery = `SELECT COUNT(*)::INTEGER AS total ${baseQuery}`;
        const countResult = await db.query(countQuery, values);
        const totalRecords = countResult.rows[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / limitNum);

        // Fetch paginated data ordered by updateddate DESC (newest updated record first)
        const dataQuery = `SELECT * ${baseQuery} ORDER BY updateddate DESC, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        const queryValues = [...values, limitNum, offset];



        const { rows: data } = await db.query(dataQuery, queryValues);

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No updated toss records found',
                pagination: {
                    totalRecords: 0,
                    totalPages: 0,
                    currentPage: pageNum,
                    limit: limitNum
                },
                data: []
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Successfully fetched updated toss records',
            pagination: {
                totalRecords: totalRecords,
                totalPages: totalPages,
                currentPage: pageNum,
                limit: limitNum
            },
            data: data
        });

    } catch (error) {
        return res.status(500).send({
            success: false,
            message: 'Error in getUpdatedTossRecords API',
            error: error.message || error
        });
    }
};


// https://crickettossrecord.com/app-ads.txt
// https://www.crickettossrecord.com/app-ads.txt

const ensureMatchVotesTableExists = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS match_votes (
                id SERIAL PRIMARY KEY,
                match_id INT NOT NULL,
                team_id INT DEFAULT NULL,
                team_name TEXT NOT NULL,
                user_id INT DEFAULT NULL,
                guest_id TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await db.query(`
            ALTER TABLE match_votes ADD COLUMN IF NOT EXISTS team_id INT;
        `);
    } catch (e) {
        console.error("Error creating match_votes table:", e);
    }
};

const getMatchVoteStats = async (matchId, matchRecord, userId, guestId) => {
    const team1Id = matchRecord ? (matchRecord.teamid1 !== undefined ? Number(matchRecord.teamid1) : null) : null;
    const team1Name = matchRecord ? (matchRecord.teamname1 || "") : "";
    const team2Id = matchRecord ? (matchRecord.teamid2 !== undefined ? Number(matchRecord.teamid2) : null) : null;
    const team2Name = matchRecord ? (matchRecord.teamname2 || "") : "";

    const votesResult = await db.query(
        `SELECT team_id, team_name, COUNT(*)::INTEGER AS count FROM match_votes WHERE match_id = $1 GROUP BY team_id, team_name`,
        [matchId]
    );

    let team1Votes = 0;
    let team2Votes = 0;

    votesResult.rows.forEach(row => {
        const rowTeamId = row.team_id !== null && row.team_id !== undefined ? Number(row.team_id) : null;
        const rowTeamName = (row.team_name || "").trim().toLowerCase();

        if (
            (rowTeamId !== null && team1Id !== null && rowTeamId === team1Id) ||
            (team1Name && rowTeamName === team1Name.trim().toLowerCase())
        ) {
            team1Votes += row.count;
        } else if (
            (rowTeamId !== null && team2Id !== null && rowTeamId === team2Id) ||
            (team2Name && rowTeamName === team2Name.trim().toLowerCase())
        ) {
            team2Votes += row.count;
        }
    });

    const totalVotes = team1Votes + team2Votes;
    const team1Percentage = totalVotes > 0 ? parseFloat(((team1Votes / totalVotes) * 100).toFixed(2)) : 0;
    const team2Percentage = totalVotes > 0 ? parseFloat(((team2Votes / totalVotes) * 100).toFixed(2)) : 0;

    let userVotedTeamId = null;
    let userVotedTeamName = null;

    if (userId) {
        const userVote = await db.query(
            `SELECT team_id, team_name FROM match_votes WHERE match_id = $1 AND user_id = $2 LIMIT 1`,
            [matchId, userId]
        );
        if (userVote.rows.length > 0) {
            userVotedTeamId = userVote.rows[0].team_id ? Number(userVote.rows[0].team_id) : null;
            userVotedTeamName = userVote.rows[0].team_name;
        }
    } else if (guestId) {
        const guestVote = await db.query(
            `SELECT team_id, team_name FROM match_votes WHERE match_id = $1 AND guest_id = $2 LIMIT 1`,
            [matchId, guestId]
        );
        if (guestVote.rows.length > 0) {
            userVotedTeamId = guestVote.rows[0].team_id ? Number(guestVote.rows[0].team_id) : null;
            userVotedTeamName = guestVote.rows[0].team_name;
        }
    }

    return {
        matchId: Number(matchId),
        team1Id: team1Id,
        teamName1: team1Name,
        team2Id: team2Id,
        teamName2: team2Name,
        team1Votes,
        team2Votes,
        totalVotes,
        team1Percentage,
        team2Percentage,
        userVotedTeamId,
        userVotedTeamName
    };
};

const submitMatchVote = async (req, res) => {
    try {
        await ensureMatchVotesTableExists();

        const { matchId, scheduleId, teamId, teamid, selectedTeamId, teamName, selectedTeam, guestId } = req.body || {};
        const targetMatchId = matchId || scheduleId;
        const inputTeamId = teamId !== undefined ? teamId : (teamid !== undefined ? teamid : selectedTeamId);
        const inputTeamName = teamName || selectedTeam;

        if (!targetMatchId) {
            return res.status(400).json({
                success: false,
                message: "Match ID is required"
            });
        }

        if ((inputTeamId === undefined || inputTeamId === null || inputTeamId === "") && (!inputTeamName || !inputTeamName.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter teamId or teamName to vote"
            });
        }

        // Validate schedule existence
        const scheduleResult = await db.query(
            `SELECT id, teamid1, teamid2, teamName1, teamName2 FROM tblschedule WHERE id = $1 LIMIT 1`,
            [targetMatchId]
        );

        if (scheduleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Schedule/Match not found"
            });
        }

        const match = scheduleResult.rows[0];
        const matchTeam1Id = match.teamid1 !== null && match.teamid1 !== undefined ? Number(match.teamid1) : null;
        const matchTeam2Id = match.teamid2 !== null && match.teamid2 !== undefined ? Number(match.teamid2) : null;
        const matchTeam1Name = match.teamname1 || "";
        const matchTeam2Name = match.teamname2 || "";

        let matchedTeamId = null;
        let matchedTeamName = null;

        // 1. Match by Team ID if provided
        if (inputTeamId !== undefined && inputTeamId !== null && inputTeamId !== "") {
            const numTeamId = Number(inputTeamId);
            if (matchTeam1Id !== null && numTeamId === matchTeam1Id) {
                matchedTeamId = matchTeam1Id;
                matchedTeamName = matchTeam1Name;
            } else if (matchTeam2Id !== null && numTeamId === matchTeam2Id) {
                matchedTeamId = matchTeam2Id;
                matchedTeamName = matchTeam2Name;
            }
        }

        // 2. Fallback matching by Team Name if Team ID didn't match or wasn't provided
        if (matchedTeamId === null && inputTeamName && inputTeamName.trim()) {
            const cleanTargetTeam = inputTeamName.trim().toLowerCase();
            if (matchTeam1Name && cleanTargetTeam === matchTeam1Name.trim().toLowerCase()) {
                matchedTeamId = matchTeam1Id;
                matchedTeamName = matchTeam1Name;
            } else if (matchTeam2Name && cleanTargetTeam === matchTeam2Name.trim().toLowerCase()) {
                matchedTeamId = matchTeam2Id;
                matchedTeamName = matchTeam2Name;
            }
        }

        if (matchedTeamId === null && !matchedTeamName) {
            return res.status(400).json({
                success: false,
                message: `Invalid teamId (${inputTeamId}) for this match. Valid Team IDs for this match: Team 1 ID = ${matchTeam1Id} (${matchTeam1Name}), Team 2 ID = ${matchTeam2Id} (${matchTeam2Name})`
            });
        }

        let userId = null;
        let effectiveGuestId = null;

        if (req.user && req.user.type === "USER") {
            userId = req.user.id;
        } else {
            effectiveGuestId = guestId || (req.user && req.user.guestId);
            if (!effectiveGuestId) {
                return res.status(400).json({
                    success: false,
                    message: "Guest ID is required for guest voting"
                });
            }
        }

        // Check if vote already exists for this user/guest on this match
        let existingVote;
        if (userId) {
            existingVote = await db.query(
                `SELECT id, team_id, team_name FROM match_votes WHERE match_id = $1 AND user_id = $2 LIMIT 1`,
                [targetMatchId, userId]
            );
        } else {
            existingVote = await db.query(
                `SELECT id, team_id, team_name FROM match_votes WHERE match_id = $1 AND guest_id = $2 LIMIT 1`,
                [targetMatchId, effectiveGuestId]
            );
        }

        let isUpdated = false;
        if (existingVote.rows.length > 0) {
            await db.query(
                `UPDATE match_votes SET team_id = $1, team_name = $2, created_at = CURRENT_TIMESTAMP WHERE id = $3`,
                [matchedTeamId, matchedTeamName, existingVote.rows[0].id]
            );
            isUpdated = true;
        } else {
            await db.query(
                `INSERT INTO match_votes (match_id, team_id, team_name, user_id, guest_id) VALUES ($1, $2, $3, $4, $5)`,
                [targetMatchId, matchedTeamId, matchedTeamName, userId, effectiveGuestId]
            );
        }

        // Fetch updated vote statistics for the match
        const voteStats = await getMatchVoteStats(targetMatchId, match, userId, effectiveGuestId);

        return res.status(200).json({
            success: true,
            message: isUpdated ? "Vote updated successfully" : "Vote submitted successfully",
            data: voteStats
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error submitting match vote",
            error: error.message || error
        });
    }
};

const getMatchVoteResults = async (req, res) => {
    try {
        await ensureMatchVotesTableExists();

        const { matchId, guestId } = req.body || {};
        const targetMatchId = matchId;

        if (!targetMatchId) {
            return res.status(400).json({
                success: false,
                message: "Match ID is required"
            });
        }

        const scheduleResult = await db.query(
            `SELECT id, teamid1, teamid2, teamName1, teamName2 FROM tblschedule WHERE id = $1 LIMIT 1`,
            [targetMatchId]
        );

        if (scheduleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Schedule/Match not found"
            });
        }

        const match = scheduleResult.rows[0];

        let userId = null;
        let effectiveGuestId = guestId;

        if (req.user && req.user.type === "USER") {
            userId = req.user.id;
        } else if (req.user && req.user.type === "GUEST") {
            effectiveGuestId = guestId || req.user.guestId;
        }

        const stats = await getMatchVoteStats(targetMatchId, match, userId, effectiveGuestId);

        return res.status(200).json({
            success: true,
            message: "Match vote results fetched successfully",
            data: stats
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching match vote results",
            error: error.message || error
        });
    }
};

const getCurrentMatchesVoting = async (req, res) => {
    try {
        await ensureMatchVotesTableExists();

        const { limit = 10, guestId } = req.body || {};
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);

        let userId = null;
        let effectiveGuestId = guestId;

        if (req.user && req.user.type === "USER") {
            userId = req.user.id;
        } else if (req.user && req.user.type === "GUEST") {
            effectiveGuestId = guestId || req.user.guestId;
        }

        // Fetch current / upcoming matches
        const matchesResult = await db.query(
            `SELECT * FROM tblschedule ORDER BY id DESC LIMIT $1`,
            [limitNum]
        );

        if (matchesResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No current matches found for voting",
                data: []
            });
        }

        const matchesWithVoting = await Promise.all(
            matchesResult.rows.map(async (match) => {
                const stats = await getMatchVoteStats(match.id, match, userId, effectiveGuestId);
                return {
                    ...match,
                    voting: stats
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Current matches voting list fetched successfully",
            count: matchesWithVoting.length,
            data: matchesWithVoting
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching current matches voting list",
            error: error.message || error
        });
    }
};

const getBothTeamsLast5MatchToss = async (req, res) => {
    try {

        const {
            scheduleId,
            teamid1,
            teamid2,
            limit = 5
        } = req.body || {};

        const targetMatchId = scheduleId;
        let t1Id = teamid1 !== undefined ? Number(teamid1) : null;
        let t2Id = teamid2 !== undefined ? Number(teamid2) : null;
        let t1Name = "";
        let t2Name = "";
        let currentMatchDetails = null;

        // If matchId is provided, fetch match details from tblschedule
        if (targetMatchId) {
            const currentMatchQuery = `
                SELECT id, seriesid, seriesname, matchformatid, matchformat, startdate, enddate,
                       teamname1, teamname2, teamid1, teamid2, tosswonstatus, tossstatus, tosswinnerid, matchno
                FROM tblschedule
                WHERE id = $1
                LIMIT 1
            `;
            const { rows: matchRows } = await db.query(currentMatchQuery, [targetMatchId]);

            if (matchRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Current match or schedule not found"
                });
            }

            currentMatchDetails = matchRows[0];
            t1Id = currentMatchDetails.teamid1;
            t2Id = currentMatchDetails.teamid2;
            t1Name = currentMatchDetails.teamname1 || "";
            t2Name = currentMatchDetails.teamname2 || "";
        }

        if (t1Id === undefined || t1Id === null) {
            return res.status(400).json({
                success: false,
                message: "Team name 1 is required"
            });
        }

        if (t2Id === undefined || t2Id === null) {
            return res.status(400).json({
                success: false,
                message: "Team name 2 is required"
            });
        }

        // Fetch team 1 name if not present
        if (!t1Name && t1Id) {
            const team1Res = await db.query(`SELECT teamname FROM teams WHERE id = $1 LIMIT 1`, [t1Id]);
            if (team1Res.rows.length > 0) t1Name = team1Res.rows[0].teamname;
        }

        // Fetch team 2 name if not present
        if (!t2Name && t2Id) {
            const team2Res = await db.query(`SELECT teamname FROM teams WHERE id = $1 LIMIT 1`, [t2Id]);
            if (team2Res.rows.length > 0) t2Name = team2Res.rows[0].teamname;
        }

        const matchLimit = Math.max(1, parseInt(limit, 10) || 5);

        // Helper function to format team's last N toss matches
        const fetchTeamTossHistory = async (teamId, teamName) => {
            const historyQuery = `
                SELECT id, seriesid, seriesname, matchformatid, matchformat, startdate, enddate,
                       teamname1, teamname2, teamid1, teamid2, tosswonstatus, tossstatus, tosswinnerid, matchno
                FROM tblschedule
                WHERE (teamid1 = $1 OR teamid2 = $1)
                  AND tossstatus = true
                  AND ($2::INTEGER IS NULL OR id != $2)
                ORDER BY startdate DESC, id DESC
                LIMIT $3
            `;

            const { rows } = await db.query(historyQuery, [teamId, targetMatchId, matchLimit]);

            const matches = rows.map(m => {
                const isTeam1 = Number(m.teamid1) === Number(teamId);
                const opponentTeamId = isTeam1 ? m.teamid2 : m.teamid1;
                const opponentTeamName = isTeam1 ? m.teamname2 : m.teamname1;

                const isAbandonedMatch = m.tosswonstatus && m.tosswonstatus.toLowerCase().includes("abandon");

                let isTossWon = false;
                let tossResult = "LOST";

                if (isAbandonedMatch) {
                    tossResult = "ABANDONED";
                } else if (m.tosswinnerid !== null && m.tosswinnerid !== undefined) {
                    isTossWon = Number(m.tosswinnerid) === Number(teamId);
                    tossResult = isTossWon ? "WON" : "LOST";
                } else if (m.tosswonstatus && teamName) {
                    isTossWon = m.tosswonstatus.toLowerCase().includes(teamName.toLowerCase());
                    tossResult = isTossWon ? "WON" : "LOST";
                }

                return {
                    matchId: m.id,
                    matchNo: m.matchno,
                    seriesName: m.seriesname,
                    matchFormat: m.matchformat,
                    startDate: m.startdate,
                    team1Name: m.teamname1,
                    team2Name: m.teamname2,
                    opponentTeamId: opponentTeamId ? Number(opponentTeamId) : null,
                    opponentTeamName: opponentTeamName,
                    tossWinnerId: m.tosswinnerid ? Number(m.tosswinnerid) : null,
                    tossWonStatus: m.tosswonstatus,
                    isTossWon: isTossWon,
                    isAbandoned: isAbandonedMatch || false,
                    tossResult: tossResult
                };
            });

            const totalMatches = matches.length;
            const tossWins = matches.filter(m => m.isTossWon).length;
            const abandonedMatchesCount = matches.filter(m => m.isAbandoned).length;
            const tossLosses = totalMatches - tossWins - abandonedMatchesCount;
            const validMatches = totalMatches - abandonedMatchesCount;
            const winPercentage = validMatches > 0 ? parseFloat(((tossWins / validMatches) * 100).toFixed(2)) : 0;
            const form = matches.map(m => {
                let tossStatus = m.isTossWon ? "W" : "L";
                if (m.isAbandoned) {
                    tossStatus = "A";
                }
                return {
                    tossStatus: tossStatus
                };
            });

            return {
                teamId: Number(teamId),
                teamName: teamName,
                totalMatches: totalMatches,
                tossWins: tossWins,
                tossLosses: tossLosses,
                winPercentage: `${winPercentage}%`,
                tossForm: form,
                lastMatches: matches
            };
        };

        // Fetch last 5 toss matches for Team 1 and Team 2 in parallel
        const [team1History, team2History] = await Promise.all([
            fetchTeamTossHistory(t1Id, t1Name),
            fetchTeamTossHistory(t2Id, t2Name)
        ]);

        // Fetch Head-to-Head Last 5 Toss matches between Team 1 & Team 2
        const h2hQuery = `
            SELECT id, seriesid, seriesname, matchformatid, matchformat, startdate, enddate,
                   teamname1, teamname2, teamid1, teamid2, tosswonstatus, tossstatus, tosswinnerid, matchno
            FROM tblschedule
            WHERE ((teamid1 = $1 AND teamid2 = $2) OR (teamid1 = $2 AND teamid2 = $1))
              AND tossstatus = true
              AND ($3::INTEGER IS NULL OR id != $3)
            ORDER BY startdate DESC, id DESC
            LIMIT $4
        `;
        const { rows: h2hRows } = await db.query(h2hQuery, [t1Id, t2Id, targetMatchId, matchLimit]);

        const headToHead = h2hRows.map(m => {
            let winnerTeamName = "";
            if (m.tosswinnerid !== null && m.tosswinnerid !== undefined) {
                winnerTeamName = Number(m.tosswinnerid) === Number(t1Id) ? t1Name : (Number(m.tosswinnerid) === Number(t2Id) ? t2Name : "");
            } else if (m.tosswonstatus) {
                if (t1Name && m.tosswonstatus.toLowerCase().includes(t1Name.toLowerCase())) winnerTeamName = t1Name;
                else if (t2Name && m.tosswonstatus.toLowerCase().includes(t2Name.toLowerCase())) winnerTeamName = t2Name;
            }

            return {
                matchId: m.id,
                matchNo: m.matchno,
                seriesName: m.seriesname,
                matchFormat: m.matchformat,
                startDate: m.startdate,
                team1Name: m.teamname1,
                team2Name: m.teamname2,
                tossWinnerId: m.tosswinnerid ? Number(m.tosswinnerid) : null,
                tossWinnerName: winnerTeamName,
                tossWonStatus: m.tosswonstatus
            };
        });

        return res.status(200).json({
            success: true,
            message: "Last 5 match toss history for both teams fetched successfully",
            data: {
                currentMatch: currentMatchDetails ? {
                    matchId: currentMatchDetails.id,
                    seriesName: currentMatchDetails.seriesname,
                    matchFormat: currentMatchDetails.matchformat,
                    matchNo: currentMatchDetails.matchno,
                    startDate: currentMatchDetails.startdate,
                    team1Id: Number(currentMatchDetails.teamid1),
                    team1Name: currentMatchDetails.teamname1,
                    team2Id: Number(currentMatchDetails.teamid2),
                    team2Name: currentMatchDetails.teamname2,
                    tossStatus: currentMatchDetails.tossstatus,
                    tossWonStatus: currentMatchDetails.tosswonstatus,
                    tossWinnerId: currentMatchDetails.tosswinnerid ? Number(currentMatchDetails.tosswinnerid) : null
                } : null,
                team1: team1History,
                team2: team2History,
                headToHeadLast5: headToHead
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching last 5 match toss history for both teams",
            error: error.message || error
        });
    }
};

export {
    createUser, getAllUsers, login, dashboard, Usertype, getUsertype, deleteUsertype, series, getAllSeries, deleteAllSeries, Seriestype,
    getSeriestype, deleteSeriestype, MatchFormat, deleteMatchFormat, getMatchFormat, schedules, getSchedule, getNext10Matches, getUpdatedTossRecords, updateTossStatus, ContactUS,
    getAllAds, insertAds, createGuestToken, addMatchView, getScheduleViewCount, createteam, getteam, deleteteam, saveFcmToken, submitMatchVote, getMatchVoteResults, getCurrentMatchesVoting,
    getBothTeamsLast5MatchToss
}