"use strict";

const Stripe = require("stripe"); // Import the Stripe module
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::item.item", ({ strapi }) => ({
  // Define a custom action to handle the webhook request from Stripe
  async handleWebhook(ctx) {
    // console.log(stripe);

    // const sig = ctx.request.headers["stripe-signature"];
    // console.log("sig: ", sig);
    // console.log("data :", ctx.request.data);
    // console.log("body :", ctx.request.body.id);
    // console.log("stringify: ", JSON.stringify(ctx.request.body));
    // console.log("rawBody :", ctx.request.rawBody);
    // console.log("request :", ctx.request);

    // const sessionId = ctx.request.body.data.object.id;
    // console.log("session: ", sessionId);

    // try {

    //   const event = stripe.webhooks.constructEvent(
    //     ctx.request.body,
    //     sig,
    //     webhookSecret
    //   );

    //   console.log("event: ", event);
    //   console.log("Error:", err.message);

    try {
      if (ctx.request.body.type === "checkout.session.completed") {
        const checkoutSession = await ctx.request.body.data.object.id;

        // Get the line items for the checkout session
        const lineItems = await stripe.checkout.sessions.listLineItems(
          checkoutSession
        );

        console.log("lineitems: ", lineItems.data);
        // console.log("data.price informatgion: ", lineItems.data.price);
        console.log("lineItems length:", lineItems.data.length);

        // Loop through the line items in the checkout session
        for (const lineItem of lineItems.data) {
          const { price, quantity, description } = lineItem;
          //   const custom_product_id = price.description.split(":")[1];
          const custom_product_id = description;

          console.log("customproductID: ", custom_product_id);
          console.log("price: ", price);
          console.log("quantity: ", quantity);

          // Retrieve the item from your Strapi database using the Strapi SDK
          const product = await strapi.services.item.findOne({
            id: custom_product_id,
          });
          //   console.log("product: ", product);

          // Calculate the new stock level
          const newStock = product.stockLevel - quantity;

          // Update the stock level in your Strapi database using the Strapi SDK
          await strapi.services.item.update(
            { id: custom_product_id },
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
