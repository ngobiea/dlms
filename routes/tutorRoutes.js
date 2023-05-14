const express = require("express");
const tutorController = require("../controllers/tutorController");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middlewares/is-auth");

router.post(
  "/signup",
  [
    body("firstName").trim().notEmpty().withMessage("First Name is required"),
    body("lastName").trim().notEmpty().withMessage("Last Name is required"),
    body("institution")
      .trim()
      .notEmpty()
      .withMessage("Institution is required"),
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password is too short"),
  ],
  tutorController.signup
);
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password is too short"),
  ],
  tutorController.login
);

router.post(
  "/create-classroom",
  auth,
  [
    body("name").trim().notEmpty().withMessage("classroom name is require"),
    body("description")
      .notEmpty()
      .withMessage("Classroom description is require"),
  ],
  tutorController.createClassroom
);

router.get('/classrooms',auth,tutorController.getClassrooms)

module.exports = router;
