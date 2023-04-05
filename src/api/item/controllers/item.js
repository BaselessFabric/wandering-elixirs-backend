"use strict";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  /**
   * Handle a Stripe webhook event for a successful checkout
   */
  async handleCheckoutSuccess(ctx) {
    const { body, headers } = ctx.request;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      const event = stripe.webhooks.constructEvent(
        body,
        headers["stripe-signature"],
        webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const session = await stripe.checkout.sessions.retrieve(
          event.data.object.id,
          { expand: ["line_items"] }
        );

        for (const item of session.line_items.data) {
          const productId = item.price.product;
          const quantity = item.quantity;

          // Retrieve the item from your Strapi database using the Strapi SDK
          const product = await strapi.services.item.findOne({ id: productId });

          // Calculate the new stock level
          const newStock = product.stockLevel - quantity;

          // Update the stock level in your Strapi database using the Strapi SDK
          await strapi.services.item.update(
            { id: productId },
            { stockLevel: newStock }
          );
        }
      }

      // Send a success response to Stripe
      ctx.send({ received: true });
    } catch (err) {
      // Handle any errors that occur during the update process
      console.log(err);
      ctx.send({ received: false, error: err });
    }
  },
  // ...
};
