"use strict";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Import the Stripe module

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::item.item",
  {
    // Define a custom action to handle the webhook request from Stripe
    async webhook(ctx) {
      const { body, headers } = ctx.request;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      try {
        const event = stripe.webhooks.constructEvent(
          body,
          headers["stripe-signature"],
          webhookSecret
        );

        strapi.log.debug(event);

        if (event.type === "checkout.session.completed") {
          const checkoutSession = await stripe.checkout.sessions.retrieve(
            event.data.object.id,
            { expand: ["line_items"] }
          );

          strapi.log.debug(checkoutSession);

          // Loop through the line items in the checkout session
          for (const lineItem of checkoutSession.line_items) {
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
        strapi.log.debug(err);
        ctx.send({ received: false, error: err });
      }
    },

    // Define your other controller actions here, such as index, create, update, etc.
  },
  {
    routes: {
      webhook: {
        method: "POST",
      },
    },
  }
);
