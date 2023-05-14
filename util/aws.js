const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
require("@aws-sdk/credential-provider-ini");



const sesClient = new SESClient({
  region: process.env.AWS_REGION,
});
exports.sendEmail = async (to, subject, body ) => {
     const sendEmailParams = {
    Source: process.env.SENDER_EMAIL,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Html: {
          Data: body
        }
      }
    }
  };
  try {
    const command = new SendEmailCommand(sendEmailParams);
    const response = await sesClient.send(command);
    console.log(`Email sent! MessageId: ${response.MessageId}`);
  } catch (error) {
    console.error(`Failed to send email: ${error.message}`);
  }
}