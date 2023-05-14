var jwt = require("jsonwebtoken");
const Student = require("../model/studentModel");
const aws = require("../util/aws");
const Tutor = require("../model/tutorModel");
const emailMessages = require("../util/emailMessages");

exports.verifyEmail = async (req, res, next) => {
  const { token } = req.params;
  try {
    const decodedToken = jwt.verify(token, "mySecretJWT");
    const { userType, userId } = decodedToken;

    if (userType === "tutor") {
      const tutor = await Tutor.findById(userId);
      if (!tutor) {
        const error = new Error("Tutor not found");
        error.statusCode = 404;
        throw error;
      }
      tutor.verified = true;
      await tutor.save();
    } else if (userType === "student") {
      const student = await Student.findById(userId);
      if (!student) {
        const error = new Error("Student not found");
        error.statusCode = 404;
        throw error;
      }
      student.verified = true;
      await student.save();
    } else {
      const error = new Error("Invalid userType");
      error.statusCode = 400;
      throw error;
    }
    res.status(200).json({ message: "Email verified" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.resendVerificationCode = async (req, res, next) => {
  console.log(req.body);
  const { email } = req.body;
  try {
    const existingTutor = await Tutor.findOne({ email: email });
    const existingStudent = await Student.findOne({ email: email });

    if (!existingTutor && !existingStudent) {
      // If no tutor or student exists with the given email, return 404 Not Found status
      const error = new Error("No user found with this email");
      error.statusCode = 404;
      throw error;
    }

    const user = existingTutor || existingStudent; // Get the user (either tutor or student) based on the email

    // Generate new JWT with user information
    const token = jwt.sign(
      { userId: user._id, userType: existingTutor ? "tutor" : "student" },
      "mySecretJWT",
      {
        expiresIn: "1h",
      }
    );

    const verificationLink = `http://localhost:8080/verify-email/${token}`;
    try {
      aws.sendEmail(
        email,
        "Verify Your Email to Join Us!",
        emailMessages.signUpEmail(user.firstName, verificationLink)
      );
    } catch (error) {
      console.error(error);
      const err = new Error("Failed to send verification email");
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json({ message: "Verification email sent successfully" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.logout = (req, res, next) => {
  // Clear the token cookie to log the user out
  res.clearCookie("token");
  res.status(200).json({ message: "Logout successful" });
};

