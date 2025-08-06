const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const productsCollection = db.collection("events");
    const cartCollection = db.collection("cartItems");


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
        user,
      });
    });

   app.post("/add-product", async (req, res) => {
  try {
    const { name, price, description, image, quantity, seller, email } = req.body;

    // Validate required fields
    if (!name || !price || !description || !image || !quantity || !seller || !email) {
      return res.status(400).send({ message: "All fields are required" });
    }

    const newProduct = {
      name,
      price: parseFloat(price),
      description,
      image,
      quantity: parseInt(quantity),
      seller,
      email,
      createdAt: new Date(), // optional: for sorting/filtering later
    };

    const result = await productsCollection.insertOne(newProduct);

    res.send({
      message: "Product added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send({ message: "Failed to add product" });
  }
});
    app.post("/cart", async (req, res) => {
  const { product, email} = req.body;

  if (!product || !email) {
    return res.status(400).send({ message: "Product ID and email required" });
  }

  const existing = await cartCollection.findOne({ product, email });

  if (existing) {
    // If item already in cart, increase quantity
    await cartCollection.updateOne(
      { product, email },
    );
    return res.send({ message: "Increased cart item quantity" });
  }

  const result = await cartCollection.insertOne({
    product,
    email,
    addedAt: new Date(),
  });
  res.send({ message: "Added to cart", insertedId: result.insertedId });
});

// GET - Get all cart items by user email
app.get("/cart/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const items = await cartCollection.find({ email }).toArray();
    res.send(items);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch cart items" });
  }
});
    app.patch("/events/:eventId/join", async (req, res) => {
      const { eventId } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      try {
        const event = await productsCollection.findOne({
          _id: new ObjectId(eventId),
        });

        if (!event) {
          return res.status(404).send({ message: "Event not found" });
        }

        // Check if user already joined
        if (event.attendees?.includes(email)) {
          return res
            .status(400)
            .send({ message: "You have already joined this event." });
        }

        const result = await productsCollection.updateOne(
          { _id: new ObjectId(eventId) },
          {
            $inc: { attendeeCount: 1 },
            $push: { attendees: email },
          }
        );

        res.send({ message: "Successfully joined event", result });
      } catch (error) {
        console.error("Error in PATCH /events/:eventId/join:", error);
        res.status(500).send({ message: "Failed to join event" });
      }
    });
    app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productsCollection.findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    res.send(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    res.status(500).send({ message: "Failed to fetch product" });
  }
});

    app.get("/products", async (req, res) => {
      try {
        const events = await productsCollection
          .find()
          .sort({ datetime: 1 })
          .toArray();

        res.send(events);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        res.status(500).send({ message: "Failed to fetch events" });
      }
    });
    app.get("/my-products/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const result = await productsCollection.find({ email }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Failed to get user's events:", error);
        res.status(500).send({ message: "Error fetching events" });
      }
    });
    app.get("/product/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const event = await productsCollection.findOne({ _id: new ObjectId(id) });
        if (!event) return res.status(404).send({ message: "Event not found" });
        res.send(event);
      } catch (err) {
        console.error("GET single event error:", err);
        res.status(500).send({ message: "Error retrieving event" });
      }
    });

    app.delete("/product/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Event not found" });
        }

        res.send({ message: "Event deleted successfully" });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send({ message: "Failed to delete event" });
      }
    });
    app.patch("/update-product/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      try {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { ...updatedData, datetime: new Date(updatedData.datetime) } }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).send({ message: "Nothing updated" });
        }

        res.send({ message: "Event updated successfully" });
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).send({ message: "Failed to update event" });
      }
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
