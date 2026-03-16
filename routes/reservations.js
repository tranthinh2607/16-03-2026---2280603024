var express = require("express");
var router = express.Router();
let mongoose = require('mongoose');

let reservationController = require('../controllers/reservations');
let { checkLogin } = require('../utils/authHandler.js') 

// get all cua user -> get reservations/
router.get("/", checkLogin, async function (req, res, next) {
    try {
        let result = await reservationController.getAllReservations(req.userId);
        res.send(result);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// get 1 cua user -> get reservations/:id
router.get("/:id", checkLogin, async function (req, res, next) {
    try {
        let result = await reservationController.getReservationById(req.userId, req.params.id);
        if (!result) return res.status(404).send({ message: "Reservation not found" });
        res.send(result);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// reserveACart -> post reserveACart/
router.post("/reserveACart", checkLogin, async function (req, res, next) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let result = await reservationController.reserveACart(req.userId, session);
        await session.commitTransaction();
        session.endSession();
        res.send(result);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).send({ message: err.message });
    }
});

// reserveItems -> post reserveItems/ {body gồm list product va quantity}
router.post("/reserveItems", checkLogin, async function (req, res, next) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let result = await reservationController.reserveItems(req.userId, req.body.items, session);
        await session.commitTransaction();
        session.endSession();
        res.send(result);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).send({ message: err.message });
    }
});

// cancelReserve -> post cancelReserve/:id
router.post("/cancelReserve/:id", checkLogin, async function (req, res, next) {
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let result = await reservationController.cancelReserve(req.userId, req.params.id, session);
        await session.commitTransaction();
        session.endSession();
        res.send(result);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;
