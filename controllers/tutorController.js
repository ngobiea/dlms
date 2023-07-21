const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tutor = require('../model/tutorModel');
const aws = require('../util/aws');
const Student = require('../model/studentModel');
const Classroom = require('../model/classroom');
const Assignment = require('../model/assignment');
const emailMessages = require('../util/emailMessages');
const util = require('../util/util');

exports.signup = async (req, res, next) => {
  try {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const { firstName, lastName, institution, email, password } = req.body;
    const existingTutor = await Tutor.findOne({ email: email });
    const existingStudent = await Student.findOne({ email: email });

    if (existingTutor) {
      const error = new Error('A tutor with this email already exists');
      error.statusCode = 409;
      error.type = 'email';
      throw error;
    } else if (existingStudent) {
      const error = new Error('A Student with this email already exists');
      error.statusCode = 409;
      error.type = 'email';
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

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
      { userId: newTutor._id, userType: 'tutor' },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );
    console.log(token);
    const verificationLink = `http://localhost:8080/verify-email/${token}`;

    try {
      aws.sendEmail(
        email,
        'Verify Your Email to Join Us!',
        emailMessages.signUpEmail(firstName, verificationLink)
      );

      res.status(201).json({ message: 'Tutor created', tutorId: newTutor._id });
    } catch (error) {
      console.error(error);
      const err = new Error('Failed to send verification email');
      err.statusCode = 500;
      throw err;
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    console.log(req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const { email, password } = req.body;

    const tutor = await Tutor.findOne({ email: email });
    console.log(tutor);
    if (!tutor) {
      // If no tutor is found with the provided email, return a 401 Unauthorized status
      const error = new Error('A tutor with this email could not be found.');
      error.statusCode = 401;
      throw error;
    }
    const passwordMatch = await bcrypt.compare(password, tutor.password);
    if (!passwordMatch) {
      // If the provided password doesn't match the hashed password stored in the database, return a 401 Unauthorized status
      const error = new Error('Invalid password');
      error.statusCode = 401;
      throw error;
    }
    if (!tutor.verified) {
      const error = new Error('Please verify your email first.');
      error.statusCode = 401;
      error.type = 'verify';
      throw error;
    }

    // If the email and password are valid, return a 200 OK status with a success message and a JSON Web Token (JWT)
    const token = jwt.sign(
      {
        email,
        userId: tutor._id.toString(),
      },
      process.env.JWT_SECRET, // Replace with your own secret key
      { expiresIn: '1w' }
    );
    res.status(200).json({
      userDetails: {
        userId: tutor._id.toString(),
        token,
        email,
      },
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
      console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const { name, description, code } = req.body;

    const classroom = new Classroom({
      name,
      description,
      code,
      abbreviation: util.getCapitalLetters(name),
      tutorId: req.userId,
    });
    const newClassroom = await classroom.save();
    res.status(201).json({
      message: 'Classroom created successfully',
      classroom: newClassroom,
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
    const classrooms = await Classroom.find({ tutorId: req.userId });

    res.status(200).json({
      message: 'Classrooms fetched successfully',
      classrooms,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    // Extract the data from the request body
    const { title, instruction, points, dueDate, dueTime, classroomId } =
      req.body;

    // Create a new assignment object
    const assignment = new Assignment({
      classroom: classroomId,
      title,
      instruction,
      dueDate,
      dueTime,
      points,
      files: req.files.map((file) => ({
        name: file.originalname,
        type: file.mimetype,
        path: file.location, // Use file.location for S3 uploaded files
        size: file.size,
        mimetype: file.mimetype,
      })),
    });

    // Save the assignment to the database
    await assignment.save();

    // Send a success response
    res.status(201).json({ message: 'Assignment created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred' });
  }
};
