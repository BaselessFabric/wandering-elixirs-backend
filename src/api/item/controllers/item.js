"use strict";

const Stripe = require("stripe"); // Import the Stripe module
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::item.item", ({ strapi }) => ({
  // Define a custom action to handle the webhook request from Stripe
  async handleWebhook(ctx) {
    try {
      if (ctx.request.body.type === "checkout.session.completed") {
        const checkoutSession = await ctx.request.body.data.object.id;

        // Get the line items for the checkout session
        const lineItems = await stripe.checkout.sessions.listLineItems(
          checkoutSession
        );

        // Loop through the line items in the checkout session
        for (const lineItem of lineItems.data) {
          const { price, quantity, description, reference_id, name } = lineItem;
          const splitArray = lineItem.description.split(":");
          const custom_product_id = parseInt(splitArray[1]);

          let product;
          product = await strapi
            .service("api::item.item")
            .findOne(custom_product_id);

          // Calculate the new stock level
          const newStock = product.stockLevel - quantity;

          // Update the stock level in your Strapi database using the Strapi SDK
          await strapi.service("api::item.item").update(custom_product_id, {
            data: {
              stockLevel: newStock,
            },
          });
        }

        // Send a success response to Stripe
        ctx.send({ received: true });
      }
    } catch (err) {
      // Handle any errors that occur during the update process
      console.log(err);
      ctx.send({ received: false, error: err });
    }
  },

  // Define your other controller actions here, such as index, create, update, etc.
}));
