"use strict";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Import the Stripe module

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::item.item", ({ strapi }) => ({
  // Define a custom action to handle the webhook request from Stripe
  async handleWebhook(ctx) {
    const { body, headers } = ctx.request;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      const event = stripe.webhooks.constructEvent(
        body,
        headers["stripe-signature"],
        webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const checkoutSession = await stripe.checkout.sessions.retrieve(
          event.data.object.id
        );

        // Get the line items for the checkout session
        const lineItems = await stripe.checkout.sessions.listLineItems(
          checkoutSession.id
        );

        // Loop through the line items in the checkout session
        for (const lineItem of lineItems.data) {
          const { price, quantity } = lineItem;
          const productId = price.product;

          // Retrieve the item from your Strapi database using the Strapi SDK
          const product = await strapi.services.item.findOne({
            id: productId,
          });

          // Calculate the new stock level
          const newStock = product.stockLevel - quantity;

          // Update the stock level in your Strapi database using the Strapi SDK
          await strapi.services.item.update(
            { id: productId },
            { stockLevel: newStock }
          );
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
