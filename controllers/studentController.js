const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const Tutor = require("../model/tutorModel");
const aws = require("../util/aws");
const Classroom = require("../model/classroom");
const Student = require("../model/studentModel");
const emailMessages = require("../util/emailMessages");

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const { firstName, lastName, studentId, institution, email, password } =
      req.body;
    const existingTutor = await Tutor.findOne({ email: email });
    const existingStudent = await Student.findOne({ email: email });
    if (existingTutor) {
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
         const hashedPassword = await bcrypt.hash(password, 12);

      const student = new Student({
        firstName,
        lastName,
        studentId,
        institution,
        email,
        password: hashedPassword,
        verified: false,
      });
      const newStudent = await student.save();
      const token = jwt.sign(
        { userId: newStudent._id, userType: "student" },
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
      res
        .status(201)
        .json({ message: "Student created", studentId: newStudent._id });
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
  

    const student = await Student.findOne({ email: email });
    if (!student) {
      // If no student is found with the provided email, return a 401 Unauthorized status
      const error = new Error("Email not found click signup to register");
      error.statusCode = 401;
      throw error;
    }
    if (!student.verified) {
      const error = new Error("Please verify your email first.");
      error.statusCode = 401;
      error.type = "verify";
      throw error;
    }
    const passwordMatch = await bcrypt.compare(password, student.password);
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
        userId: student._id.toString(),
      },
      process.env.JWT_SECRET, // Replace with your own secret key
      { expiresIn: "1w" }
    );
    res.status(200).json({
      message: "Login successful",
      userId: student._id.toString(),
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

exports.getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await Classroom.find({ students: req.studentId })
      .populate("tutorId", "firstName lastName email")
      .select("name description code tutorId students");
    res.status(200).json({
      message: "Joined classrooms fetched successfully",
      classrooms,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.getClassroom = async (req, res, next) => {
  try {
    const { code } = req.params;

    const classroomId = await Classroom.findOne({ code }, { _id: 1 });
    if (!classroomId) {
      const error = new Error("Classroom not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Classroom fetched successfully",
      classroomId,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
