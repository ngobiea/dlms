const express = require("express");
const shareController = require("../controllers/shareController");
const router = express.Router();


router.get("/verify-email/:token", shareController.verifyEmail);
router.post(
  "/resend-verification-code",
  shareController.resendVerificationCode
);
router.post("/logout", shareController.logout);

module.exports = router;
