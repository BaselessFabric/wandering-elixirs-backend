"use strict";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Import the Stripe module

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::item.item", {
  // Define a custom action to handle the webhook request from Stripe
  async webhook(ctx) {
    try {
      const { data } = ctx.request.body;

      console.log(data);

      // Loop through the line items in the Stripe webhook payload
      for (const item of data.object.lines.data) {
        const { id, quantity } = item; // Extract the product ID and quantity

        // Retrieve the item from your Strapi database using the Strapi SDK
        const product = await strapi.services.item.findOne({ id });

        console.log(product);

        // Calculate the new stock level
        const newStock = product.stockLevel - quantity;

        console.log(stockLevel);
        console.log(newStock);

        // Update the stock level in your Strapi database using the Strapi SDK
        await strapi.services.item.update({ id }, { stockLevel: newStock });
      }

      // Send a success response to Stripe
      ctx.send({ received: true });
    } catch (err) {
      // Handle any errors that occur during the update process
      ctx.send({ received: false, error: err });
    }
  },

  // Define your other controller actions here, such as index, create, update, etc.
});
