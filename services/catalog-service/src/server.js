const express = require("express");

const {
  port,
  mongodbUri,
  mongodbDatabase,
  supabaseUrl,
  supabaseKey,
} = require("./config/env");

const connectMongoDB = require("./database/mongodb");

const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ service: "catalog-service", status: "ok" });
});

/*prueba
console.log("PORT:", port);
console.log("MongoDB configurado:", Boolean(mongodbUri));
console.log("Base MongoDB:", mongodbDatabase);
console.log("Supabase configurado:", Boolean(supabaseUrl));
console.log("Supabase Key configurada:", Boolean(supabaseKey));
*/

const startServer = async () => {
  await connectMongoDB();

  app.listen(port, () => {
    console.log(`catalog-service listening on port ${port}`);
  });
};

startServer();