import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config";
import logger from "../utils/logger";

const seed = async () => {
  try {
    await mongoose.connect(config.DATABASE_URL);
    logger.info("Connected to MongoDB for seeding");

    const db = mongoose.connection.db!;

    // Check if admin already exists
    const existingAdmin = await db
      .collection("users")
      .findOne({ email: "admin@library.com" });

    if (existingAdmin) {
      logger.info("Admin user already exists — skipping seed");
      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash(
      "Admin@123",
      config.BCRYPT_SALT_ROUNDS,
    );

    // Create admin user
    await db.collection("users").insertOne({
      name: "Admin",
      email: "admin@library.com",
      password: hashedPassword,
      role: "admin",
      isActive: true,
      isDeleted: false,
      passwordChangedAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create default categories
    const categories = [
      {
        name: "Fiction",
        description: "Novels, short stories, and other fictional works",
      },
      {
        name: "Non-Fiction",
        description: "Factual books, essays, and informational texts",
      },
      {
        name: "Science",
        description: "Physics, chemistry, biology, and other sciences",
      },
      {
        name: "Technology",
        description: "Computer science, programming, and IT",
      },
      { name: "History", description: "Historical accounts and analysis" },
      { name: "Biography", description: "Life stories and autobiographies" },
      { name: "Children", description: "Books for children and young readers" },
      {
        name: "Reference",
        description: "Dictionaries, encyclopedias, and reference materials",
      },
    ];

    const existingCategories = await db
      .collection("categories")
      .countDocuments();
    if (existingCategories === 0) {
      await db.collection("categories").insertMany(
        categories.map((cat) => ({
          ...cat,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      logger.info(`Seeded ${categories.length} categories`);
    }

    logger.info("Seed completed successfully");
    logger.info(
      "Admin credentials — email: admin@library.com, password: Admin@123",
    );
    await mongoose.disconnect();
  } catch (error) {
    logger.error("Seed failed", { error });
    process.exit(1);
  }
};

seed();
