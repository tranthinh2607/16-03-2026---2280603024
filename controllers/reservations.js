let reservationModel = require('../schemas/reservations');
let cartModel = require('../schemas/cart');
let inventoryModel = require('../schemas/inventories');
let productModel = require('../schemas/products');

module.exports = {
    getAllReservations: async function (userId) {
        return await reservationModel.find({ user: userId }).populate('items.product');
    },
    getReservationById: async function (userId, id) {
        return await reservationModel.findOne({ user: userId, _id: id }).populate('items.product');
    },
    reserveACart: async function (userId, session) {
        // Find cart
        let cart = await cartModel.findOne({ user: userId }).session(session);
        if (!cart || cart.items.length === 0) {
            throw new Error("Cart is empty");
        }

        let totalAmount = 0;
        let reservationItems = [];

        for (let item of cart.items) {
            let inventory = await inventoryModel.findOne({ product: item.product }).session(session);
            if (!inventory || inventory.stock - inventory.reserved < item.quantity) {
                throw new Error("Not enough stock for one or more products");
            }

            // Increase reserved
            inventory.reserved += item.quantity;
            await inventory.save({ session });

            // Fetch product to get price
            let product = await productModel.findById(item.product).session(session);
            let price = product.price;
            let subtotal = price * item.quantity;

            totalAmount += subtotal;

            reservationItems.push({
                product: item.product,
                quantity: item.quantity,
                price: price,
                subtotal: subtotal
            });
        }

        // Create reservation
        let newReservation = new reservationModel({
            user: userId,
            items: reservationItems,
            totalAmount: totalAmount,
            status: "actived",
            ExpiredAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry
        });
        await newReservation.save({ session });

        // Empty cart
        cart.items = [];
        await cart.save({ session });

        return newReservation;
    },
    reserveItems: async function (userId, items, session) {
        if (!items || items.length === 0) {
            throw new Error("Items list is empty");
        }

        let totalAmount = 0;
        let reservationItems = [];

        for (let item of items) {
            let productObjId = item.product;
            let quantity = item.quantity;

            let inventory = await inventoryModel.findOne({ product: productObjId }).session(session);
            if (!inventory || inventory.stock - inventory.reserved < quantity) {
                throw new Error("Not enough stock for product " + productObjId);
            }

            // Increase reserved
            inventory.reserved += quantity;
            await inventory.save({ session });

            // Fetch product to get price
            let product = await productModel.findById(productObjId).session(session);
            let price = product.price;
            let subtotal = price * quantity;

            totalAmount += subtotal;

            reservationItems.push({
                product: productObjId,
                quantity: quantity,
                price: price,
                subtotal: subtotal
            });
        }

        // Create reservation
        let newReservation = new reservationModel({
            user: userId,
            items: reservationItems,
            totalAmount: totalAmount,
            status: "actived",
            ExpiredAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry
        });
        await newReservation.save({ session });

        return newReservation;
    },
    cancelReserve: async function (userId, reservationId, session) {
        let reservation = await reservationModel.findOne({ _id: reservationId, user: userId }).session(session);
        if (!reservation) {
            throw new Error("Reservation not found");
        }
        if (reservation.status !== "actived") {
            throw new Error("Cannot cancel reservation in status: " + reservation.status);
        }

        // Change status
        reservation.status = "cancelled";
        await reservation.save({ session });

        // Decrease reserved in inventory
        for (let item of reservation.items) {
            let inventory = await inventoryModel.findOne({ product: item.product }).session(session);
            if (inventory) {
                inventory.reserved -= item.quantity;
                if (inventory.reserved < 0) inventory.reserved = 0; // sanity check
                await inventory.save({ session });
            }
        }

        return reservation;
    }
}
