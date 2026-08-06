import express from "express";

import { createUser, dashboard, deleteAllSeries, deleteMatchFormat, deleteSeriestype, deleteUsertype, getAllSeries, getMatchFormat, getSchedule, getSeriestype, getUsertype, login, MatchFormat, schedules, series, Seriestype, updateTossStatus, Usertype } 
from "../controllers/crictosscontrollers.js"


const router = express.Router();

// Create and get User
router.post("/createUser", createUser);
router.post("/login", login);
router.post("/dashboard", dashboard);



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


export default router;