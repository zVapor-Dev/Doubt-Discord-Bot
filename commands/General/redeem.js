const {
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const moment = require("moment");
const schema = require("../../Systems/models/PremGen.js");
const User = require("../../Systems/models/UserModel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("redeem")
    .setDescription("Redeem a premium subscribtion")
    .setDefaultMemberPermissions(0)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The code you want to redeem.")
        .setRequired(true)
    ),
  category: "General",
  premium: false,
  run: async (client, interaction, config) => {
    // Check if the user with a unique ID is in our database.
    let user = await User.findOne({
      Id: interaction.user.id, // if you are using slash commands, swap message with interaction.
    });

    // Check Users input for a valid code. Like `!redeem ABCD-EFGH-IJKL`
    let code = interaction.options.getString("code");

    // Return an error if the User does not include any Premium Code
    if (!code) {
      interaction.reply(`**Please specify the code you want to redeem!**`);
    }

    // If the user is already a premium user, we dont want to save that so we return it.
    if (user && user.isPremium) {
      return interaction.reply(`**> You already are a premium user**`);
    }

    // Check if the code is valid within the database
    const premium = await schema.findOne({
      code: code.toUpperCase(),
    });

    // Set the expire date for the premium code
    if (premium) {
      const expires = moment(premium.expiresAt).format(
        "dddd, MMMM Do YYYY HH:mm:ss"
      );

      // Once the code is expired, we delete it from the database and from the users profile
      user.isPremium = true;
      user.premium.redeemedBy.push(interaction.user);
      user.premium.redeemedAt = Date.now();
      user.premium.expiresAt = premium.expiresAt;
      user.premium.plan = premium.plan;

      // Save the User within the Database
      user = await user.save({ new: true }).catch(() => {});
      client.userSettings.set(interaction.user.id, user);
      await premium.deleteOne().catch(() => {});

      // Send a success message once redeemed
      interaction.reply(
        `**You have successfully redeemed premium!**\n\n\`Expires at: ${expires}\``
      );

      // Error message if the code is not valid.
    } else {
      return interaction.reply(
        `**The code is invalid. Please try again using valid one!**`
      );
    }
  },
};
