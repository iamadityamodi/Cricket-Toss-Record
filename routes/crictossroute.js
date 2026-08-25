import express from "express";

import { addMatchView, ContactUS, createGuestToken, createteam, createUser, dashboard, deleteAllSeries, deleteMatchFormat, deleteSeriestype, deleteteam, deleteUsertype, getAllAds, getAllSeries, getAllUsers, getMatchFormat, getSchedule, getNext10Matches, getUpdatedTossRecords, getScheduleViewCount, getSeriestype, getteam, getUsertype, insertAds, login, MatchFormat, saveFcmToken, schedules, series, Seriestype, updateTossStatus, Usertype, submitMatchVote, getMatchVoteResults, getCurrentMatchesVoting, getBothTeamsLast5MatchToss }
    from "../controllers/crictosscontrollers.js"
import authenticateToken from "../controllers/authMiddleware.js";
import { SendNotification } from "../controllers/sendNotification.js";



const router = express.Router();

// Create and get User
router.post("/createUser", createUser);
router.post("/getAllUsers", getAllUsers);
router.post("/login", login);
router.post("/guest-token", createGuestToken);
router.post("/save-token", saveFcmToken);
router.post("/dashboard", authenticateToken, dashboard);


// Create and get team
router.post("/createteam", authenticateToken, createteam);
router.post("/getteam", authenticateToken, getteam);
router.post("/deleteteam", authenticateToken, deleteteam);


// Create and get Usertype
router.post("/Usertype", authenticateToken, Usertype);
router.post("/getUsertype", authenticateToken, getUsertype);
router.post("/deleteUsertype", authenticateToken, deleteUsertype);

// Create and get Series
router.post("/series", authenticateToken, series);
router.post("/getAllSeries", authenticateToken, getAllSeries);
router.post("/deleteAllSeries", authenticateToken, deleteAllSeries);

// Create and get Schedule
router.post("/schedules", authenticateToken, schedules);
router.post("/getSchedule", authenticateToken, getSchedule);
router.post("/getNext10Matches", authenticateToken, getNext10Matches);
router.post("/getNext10MatchRecords", authenticateToken, getNext10Matches);
router.post("/getUpdatedTossRecords", authenticateToken, getUpdatedTossRecords);
router.post("/getBothTeamsLast5MatchToss", authenticateToken, getBothTeamsLast5MatchToss);
router.post("/last-5-match-toss", authenticateToken, getBothTeamsLast5MatchToss);
router.post("/updateTossStatus", authenticateToken, updateTossStatus);

// Match Voting
router.post("/match-vote", authenticateToken, submitMatchVote);
router.post("/getMatchVoteResults", authenticateToken, getMatchVoteResults);
router.post("/getCurrentMatchesVoting", authenticateToken, getCurrentMatchesVoting);

// Series Type
router.post("/Seriestype", authenticateToken, Seriestype);
router.post("/getSeriestype", authenticateToken, getSeriestype);
router.post("/deleteSeriestype", authenticateToken, deleteSeriestype);

// Match Format Type
router.post("/MatchFormat", authenticateToken, MatchFormat);
router.post("/getMatchFormat", authenticateToken, getMatchFormat);
router.post("/deleteMatchFormat", authenticateToken, deleteMatchFormat);

// Contact Us
router.post("/ContactUS", ContactUS);

// Ads
router.post("/insertAds", insertAds);
router.post("/getAllAds", getAllAds);

// Match View
router.post("/match-view", authenticateToken, addMatchView);
router.post("/schedule-view-count", authenticateToken, getScheduleViewCount);

// Send Notification
router.post("/send", SendNotification);



export default router;