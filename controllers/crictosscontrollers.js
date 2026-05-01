import db from "../config/db.js";
import moment from "moment-timezone";
import { DateTime } from "luxon";


const createUser = async (req, res) => {
    try {
        const connection = await db.getConnection();
        const { firstname, middlename, lastname, selectlogintype, emailid, passoword, confirmpassoword, mobileno } = req.body
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

        await connection.beginTransaction();

        const [tblusertype] = await connection.query(
            "SELECT * FROM tblusertype WHERE id = ?",
            [selectlogintype]
        );


        let newLoginType = null

        if (tblusertype.length > 0) {

            newLoginType = tblusertype[0].usertype;

        } else {

            return res.status(500).send({
                success: false,
                message: 'Not available any login type'
            })
        }

        // ✅ Check mobile exists
        const [existingMobile] = await db.query(
            "SELECT * FROM tabregistration WHERE mobileno = ?",
            [mobileno]
        );

        if (existingMobile.length > 0) {
            return res.status(400).send({
                success: false,
                message: "Mobile number already exists"
            });
        }

        // ✅ Check email exists
        const [existingEmailid] = await db.query(
            "SELECT * FROM tabregistration WHERE emailid = ?",
            [emailid]
        );

        if (existingEmailid.length > 0) {
            return res.status(400).send({
                success: false,
                message: "Email ID already exists"
            });
        }


        const formattedDate = getIndianDateTime();

        const [data] = await db.query(
            `INSERT INTO tabregistration ( firstname , middlename, lastname,logintype, emailid, password, mobileno, createdate,  updateddate )  
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firstname, middlename, lastname, newLoginType, emailid, passoword, mobileno, formattedDate, null])

        res.set('Cache-Control', 'no-store');
        res.status(202).send({
            success: true,
            message: 'Successfully user created.'
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in create student API',
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


        const [rows] = await db.query(
            'SELECT * FROM tabregistration WHERE mobileno = ? AND password = ?',
            [mobileno, password]
        );

        if (rows.length > 0) {
            const user = rows[0]; // get the first (and only) user
            return res.status(200).send({

                success: true,
                message: 'Successfully Logged In.',
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
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in login API',
            error
        })
    }
}

const dashboard = async (req, res) => {
    try {

        const { id } = req.body;

        if (!id) {
           
            return res.status(200).send({
                success: false,
                message: 'Data Not Load'
            });
        }


        const [rows] = await db.query(
            'SELECT * FROM tabregistration WHERE id',
            [id]
        );

        if (rows.length > 0) {
            const user = rows[0]; // get the first (and only) user
            return res.status(200).send({

                success: true,
                message: 'Successfully Logged In.',
                data: {
                    user_id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    logintype: user.logintype,
                    
                     
                }
            });
        } else {
            return res.status(200).send({
                success: false,
                message: 'Data Not Load'
            });
        }

    } catch (error) {
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in login API',
            error
        })
    }
}

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
            `INSERT INTO tblusertype ( usertype )  VALUES (?)`,
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
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in create User Type API',
            error
        })
    }
}

const getUsertype = async (req, res) => {
    try {

        const [data] = await db.query(" SELECT * FROM tblusertype")

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
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in get all series type API',
            error
        })
    }
}

const deleteUsertype = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const [result] = await db.query(
            "DELETE FROM tblusertype WHERE id = ?",
            [id]
        );

        console.log("id", id);


        if (result.affectedRows === 0) {
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
        console.log(error);
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
        const { seriesname, seriestype, betStartTime, betEndTime, userZone } = req.body

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

        const zone = userZone || "Asia/Kolkata";



        const formats = [
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss.SSSZ"
        ];

        const betEndUser = moment.tz(betEndTime, formats, zone);

        if (!betEndUser.isValid()) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });
        }

        const EndUTime = betEndUser.utc().format("YYYY-MM-DD HH:mm:ss");
        const StartTime = betEndUser.utc().format("YYYY-MM-DD HH:mm:ss");

        const betStartUTC = DateTime.utc().toSQL({ includeOffset: false });




        /* =====================================================
           INSERT
        ===================================================== */

        await db.query(
            `INSERT INTO tblseries
            (seriesname, seriestype, betStartTime, betEndTime,
             created_date, updated_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [

                seriesname, seriestype, StartTime, EndUTime, betStartUTC, null
            ]
        );



        return res.status(201).json({
            success: true,
            message: "Successfully Inserted New Series",

        });

    } catch (error) {

        console.error("❌ createAllBetsWithImage:", error);

        return res.status(500).json({
            success: false,
            message: "Error creating bet",
            error: error.message
        });
    }
}

const getAllSeries = async (req, res) => {
    try {

       

        console.log("Body Data:", req.body); // 🔍 Debug

        const { seriestype } = req.body;

        // दोनों handle (typo + correct)
        const type = seriestype;


        let query = "SELECT * FROM tblseries WHERE 1=1";
        let values = [];

        if (type && type.trim() !== "") {
            query += " AND TRIM(LOWER(seriestype)) = TRIM(LOWER(?))";
            values.push(type);
        }

         
        console.log("SQL:", query);
        console.log("Values:", values);

        const [data] = await db.query(query, values);

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No Schedules Available',
                data: []
            });
        }

        res.status(200).send({
            success: true,
            message: 'Success...',
            data: data,
        });

    } catch (error) {
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in Get All Student API',
            error
        })
    }
}

const deleteAllSeries = async (req, res) => {
    try {

        const { id } = req.body;   // ✅ get id from params

        const [result] = await db.query(
            "DELETE FROM tblseries WHERE id = ?",
            [id]
        );

        console.log("id", id);


        if (result.affectedRows === 0) {
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
        console.log(error);
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
            `INSERT INTO tblseriestype ( seriestype )  VALUES (?)`,
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
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in create Login Type API',
            error
        })
    }
}

const getSeriestype = async (req, res) => {
    try {

        const [data] = await db.query(" SELECT * FROM tblseriestype")

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
        console.log(error)
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

        const [result] = await db.query(
            "DELETE FROM tblseriestype WHERE id = ?",
            [id]
        );

        console.log("id", id);


        if (result.affectedRows === 0) {
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
        console.log(error);
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
            `INSERT INTO tblmatchformat ( formatname )  VALUES (?)`,
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
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in create Login Type API',
            error
        })
    }
}

const getMatchFormat = async (req, res) => {
    try {

        const [data] = await db.query(" SELECT * FROM tblmatchformat")

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
        console.log(error)
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

        const [result] = await db.query(
            "DELETE FROM tblmatchformat WHERE id = ?",
            [id]
        );

        console.log("id", id);


        if (result.affectedRows === 0) {
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
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in delete API",
            error
        });
    }
};


const schedules = async (req, res) => {

    const connection = await db.getConnection();


    try {
        const { seriesid, matchFormatid, startDate, endDate, teamName1, teamName2, userZone } = req.body

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
        } else if (!startDate) {
            return res.status(500).send({
                success: false,
                message: 'Please enter startDate'
            })
        } else if (!endDate) {
            return res.status(500).send({
                success: false,
                message: 'Please enter endDate'
            })
        } else if (!teamName1) {
            return res.status(500).send({
                success: false,
                message: 'Please enter teamName1'
            })
        } else if (!teamName2) {
            return res.status(500).send({
                success: false,
                message: 'Please enter teamName2'
            })
        }

        const [seriesdata] = await connection.query(
            "SELECT seriesname FROM tblseries WHERE id = ?",
            [seriesid]
        );


        let newSeriesName = null

        if (seriesdata.length > 0) {

            newSeriesName = seriesdata[0].seriesname;

        } else {

            return res.status(500).send({
                success: false,
                message: 'Not available any series'
            })
        }

        console.log("newBal", newSeriesName);

        const [matchformatdata] = await connection.query(
            "SELECT formatname FROM tblmatchformat WHERE id = ?",
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

        console.log("newBal", newMatchFormatName);

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
                message: "Invalid macthstarttime format"
            });
        }


        const macthendtime = moment.tz(endDate, formats, zone);

        if (!macthendtime.isValid()) {
            return res.status(400).json({
                success: false,
                message: "Invalid macthendtime format"
            });
        }


        const StartTime = macthstarttime.utc().format("YYYY-MM-DD HH:mm:ss");
        const EndTime = macthendtime.utc().format("YYYY-MM-DD HH:mm:ss");

        const createdTimeUTC = DateTime.utc().toSQL({ includeOffset: false });

        /* =====================================================
           INSERT
        ===================================================== */

        await db.query(
            `INSERT INTO tblschedule
            (seriesid, seriesname,
            matchformatid, matchFormat, 
            startDate, endDate,
             teamName1, teamName2,
              tosswonstatus, tossstatus,
             createddate, updateddate)
             VALUES (?, ?,
              ?, ?,
             ?, ?, 
             ?, ?, 
             ?, ?,
               ?, ?)`,
            [
                seriesid, newSeriesName,
                matchFormatid, newMatchFormatName,
                StartTime, EndTime,
                teamName1, teamName2,
                false, null,
                createdTimeUTC, null
            ]
        );



        return res.status(201).json({
            success: true,
            message: "Successfully Inserted New Macth Schedule",

        });

    } catch (error) {

        console.error("❌ createAllBetsWithImage:", error);

        return res.status(500).json({
            success: false,
            message: "Error creating bet",
            error: error.message
        });
    }
}


const updateTossStatus = async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id, teamName, tossdeccide } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Please enter match id"
            });
        } else if (!teamName) {
            return res.status(400).json({
                success: false,
                message: "Please select team name"
            });
        } else if (!tossdeccide) {
            return res.status(400).json({
                success: false,
                message: "Please select toss decide bat or bowl"
            });
        }

        await connection.beginTransaction();

        // ✅ Check if already completed
        const [checkStatus] = await connection.query(
            "SELECT * FROM tblschedule WHERE id = ?",
            [id]
        );

                if (checkStatus.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Match not found"
                    });
                }




            const thisteamwon =
            teamName + " won the toss and opt to " + tossdeccide;

        await connection.query(
            `UPDATE tblschedule 
     SET tosswonstatus = ?, 
         tossstatus = true
     WHERE id = ?`,
            [thisteamwon, id]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Toss updated successfully"
        });



    } catch (error) {
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in Get All Student API',
            error
        })
    }

}

const getSchedule = async (req, res) => {
    try {


        console.log("Body Data:", req.body); // 🔍 Debug

        const { matchFormat, seriesname, teamName1, teamName2 } = req.body;

        // दोनों handle (typo + correct)
        const format = matchFormat;


        let query = "SELECT * FROM tblschedule WHERE 1=1";
        let values = [];

        if (format && format.trim() !== "") {
            query += " AND TRIM(LOWER(matchFormat)) = TRIM(LOWER(?))";
            values.push(format);
        }

        if (seriesname && seriesname.trim() !== "") {
            query += " AND TRIM(LOWER(seriesname)) = TRIM(LOWER(?))";
            values.push(seriesname);
        }

        if (teamName1 && teamName1.trim() !== "") {
            query += " AND TRIM(LOWER(teamName1)) = TRIM(LOWER(?))";
            values.push(teamName1);
        }

        if (teamName2 && teamName2.trim() !== "") {
            query += " AND TRIM(LOWER(teamName2)) = TRIM(LOWER(?))";
            values.push(teamName2);
        }

        console.log("SQL:", query);
        console.log("Values:", values);

        const [data] = await db.query(query, values);

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
        console.log(error)
        res.status(500).send({
            success: false,
            message: 'Error in Get All Student API',
            error
        })
    }
}



export {
    createUser,login,dashboard, Usertype, getUsertype, deleteUsertype, series, getAllSeries, deleteAllSeries, Seriestype, getSeriestype, deleteSeriestype, MatchFormat, deleteMatchFormat, getMatchFormat, schedules, getSchedule, updateTossStatus
}