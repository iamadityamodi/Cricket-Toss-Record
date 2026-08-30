import { messaging } from "../config/firebase.js";

const SendNotification = async (req, res) => {
    try {
        const {
            token,
            title,
            body
        } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "FCM token is required"
            });
        }

        const message = {
            token: token,
            

            notification: {
                title: title || "Cricket Toss",
                body: body || "New notification"
            },

            data: {
                type: "GENERAL",
                click_action: "OPEN_NOTIFICATION"
            },

            android: {
                notification: {
                    sound: "default"
                }
            }
        };

        const response = await messaging.send(message);

        return res.status(200).json({
            success: true,
            message: "Notification sent successfully",
            messageId: response
        });

    } catch (error) {

        console.error("FCM Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send notification",
            error: error.message
        });
    }
};

export {
    SendNotification
};