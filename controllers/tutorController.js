const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const Tutor = require("../model/tutorModel");
const aws = require("../util/aws");
const Student = require("../model/studentModel");
const Classroom = require("../model/classroom");
const emailMessages = require("../util/emailMessages");
const util = require("../util/util");

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const { firstName, lastName, institution, email, password } = req.body;
    const existingTutor = await Tutor.findOne({ email: email });
    const existingStudent = await Student.findOne({ email: email }); // Query to check for existing student with the same email
    // Query to check for existing tutor with the same email
    if (existingTutor) {
      // If a tutor already exists with the same email, return a 409 Conflict status
      const error = new Error("A tutor with this email already exists");
      error.statusCode = 409;
      error.type = "email";
      throw error;
    } else if (existingStudent) {
      const error = new Error("A Student with this email already exists");
      error.statusCode = 409;
      error.type = "email";
      throw error;
    } else {
      const saltRounds = 24;
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);
      const tutor = new Tutor({
        firstName,
        lastName,
        institution,
        email,
        password: hashedPassword,
        verified: false,
      });
      const newTutor = await tutor.save();
      const token = jwt.sign(
        { userId: newTutor._id, userType: "tutor" },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
      const verificationLink = `http://localhost:8080/verify-email/${token}`;
      try {
        aws.sendEmail(
          email,
          "Verify Your Email to Join Us!",
          emailMessages.signUpEmail(firstName, verificationLink)
        );
      } catch (error) {
        console.error(error);
        const err = new Error("Failed to send verification email");
        err.statusCode = 500;
        throw err;
      }
      res.status(201).json({ message: "Tutor created", tutorId: newTutor._id });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// controller
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const { email, password } = req.body;
    console.log(password);

    const tutor = await Tutor.findOne({ email: email });
    console.log(tutor);
    if (!tutor) {
      // If no tutor is found with the provided email, return a 401 Unauthorized status
      const error = new Error("A tutor with this email could not be found.");
      error.statusCode = 401;
      throw error;
    }
    if (!tutor.verified) {
      const error = new Error("Please verify your email first.");
      error.statusCode = 401;
      error.type = "verify";
      throw error;
    }
    const passwordMatch = await bcrypt.compare(password, tutor.password);
    if (!passwordMatch) {
      // If the provided password doesn't match the hashed password stored in the database, return a 401 Unauthorized status
      const error = new Error("Invalid password");
      error.statusCode = 401;
      throw error;
    }

    // If the email and password are valid, return a 200 OK status with a success message and a JSON Web Token (JWT)
    const token = jwt.sign(
      {
        email,
        userId: tutor._id.toString(),
      },
      process.env.JWT_SECRET, // Replace with your own secret key
      { expiresIn: "1w" }
    );
    res.status(200).json({
      message: "Login successful",
      userId: tutor._id.toString(),
      token,
      email,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createClassroom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const { name, description, code } = req.body;
    console.log(req.userId);
    const classroom = new Classroom({
      name,
      description,
      code,
      abbreviation: util.getCapitalLetters(name),
      tutorId: req.userId,
    });
    const newClassroom = await classroom.save();
    res.status(201).json({
      message: "Classroom created successfully",
      classroom: newClassroom,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getClassrooms = async ( req,res, next) => {
  try {
    console.log(req.userId)
    const classrooms = await Classroom.find({ tutorId: req.userId })
    
    res.status(200).json({
      message: "Classrooms fetched successfully",
      classrooms,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
