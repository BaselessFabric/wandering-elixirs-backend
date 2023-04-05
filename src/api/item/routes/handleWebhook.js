module.exports = {
  routes: [
    {
      method: "POST",
      path: "/items",
      handler: "item.handleWebhook",
    },
  ],
};
