"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, userName, email } = ctx.request.body;
    try {
      // retrieve item information

      console.log(products);

      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);

          console.log("item: ", item);

          return {
            price_data: {
              currency: "gbp",
              product_data: {
                name: item.name,
                description: product.id,
                metadata: {
                  custom_product_id: product.id,
                },
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,
          };
        })
      );

      console.log(lineItems);
      console.log("productData: ", lineItems.product_data);

      // create a stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],

        customer_email: email,
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000",
        line_items: lineItems,
      });

      // create the item
      await strapi
        .service("api::order.order")
        .create({ data: { userName, products, stripeSessionId: session.id } });

      // return the session id
      return { id: session.id };
    } catch (error) {
      console.log(error);
      ctx.response.status = 500;
      return {
        error: { message: `There was a problem creating the charge` },
      };
    }
  },
}));
