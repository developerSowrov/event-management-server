const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://sowrovwebd:gRjTaxuKWZa0TRdB@cluster0.i95nn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const db = client.db("eventManagementDB");
    const usersCollection = db.collection("users");

    app.post("/register", async (req, res) => {
      const { name, email, password, photoURL } = req.body;

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).send({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await usersCollection.insertOne({
        name,
        email,
        photoURL,
        password: hashedPassword,
      });
      res.send({
        message: "User registered successfully",
        insertedId: result.insertedId,
      });
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(400).send({ message: "Invalid credentials" });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.status(400).send({ message: "Invalid credentials" });
      }

      res.send({
        message: "Login successful",
        user: { name: user.name, email: user.email },
      });
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
