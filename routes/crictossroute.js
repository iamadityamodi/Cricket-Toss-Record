import express from "express";

import { addMatchView, ContactUS, createGuestToken, createUser, dashboard, deleteAllSeries, deleteMatchFormat, deleteSeriestype, deleteUsertype, getAllAds, getAllSeries, getAllUsers, getMatchFormat, getSchedule, getScheduleViewCount, getSeriestype, getUsertype, insertAds, login, MatchFormat, schedules, series, Seriestype, updateTossStatus, Usertype }
    from "../controllers/crictosscontrollers.js"
import authenticateToken from "../controllers/authMiddleware.js";


const router = express.Router();

// Create and get User
router.post("/createUser", createUser);
router.post("/getAllUsers", getAllUsers);
router.post("/login", login);
router.post("/guest-token", createGuestToken);
router.post("/dashboard", authenticateToken, dashboard);



// Create and get Usertype
router.post("/Usertype", Usertype);
router.post("/getUsertype", getUsertype);
router.post("/deleteUsertype", deleteUsertype);

// Create and get Series
router.post("/series", series);
router.post("/getAllSeries", getAllSeries);
router.post("/deleteAllSeries", deleteAllSeries);

// Create and get Schedule
router.post("/schedules", schedules);
router.post("/getSchedule", getSchedule);
router.post("/updateTossStatus", updateTossStatus);

// Series Type
router.post("/Seriestype", Seriestype);
router.post("/getSeriestype", getSeriestype);
router.post("/deleteSeriestype", deleteSeriestype);

// Match Format Type
router.post("/MatchFormat", MatchFormat);
router.post("/getMatchFormat", getMatchFormat);
router.post("/deleteMatchFormat", deleteMatchFormat);

// Contact Us
router.post("/ContactUS", ContactUS);

// Ads
router.post("/insertAds", insertAds);
router.post("/getAllAds", getAllAds);

// Match View
router.post("/match-view", authenticateToken, addMatchView);
router.post("/schedule-view-count", getScheduleViewCount);



export default router;