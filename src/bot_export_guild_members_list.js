const { Client, Events, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async () => {
  console.log(process.env.DEBUG ? "Debugging...\n" : "Creating CSV file...\n");

  const guild = client.guilds.resolve(process.env.DISCORD_GUILD_ID);

  // Load the array of discriminators from the JSON file
  const discriminatorData = fs.readFileSync(
    path.join(__dirname, "discord_user_discriminators.json"),
    "utf8"
  );
  const discriminatorArray = JSON.parse(discriminatorData);

  // Use guild.members.fetch to make sure all members are cached first
  await guild.members
    .fetch({ withPresences: true })
    .then(async (fetchedMembers) => {
      console.log("total members:", fetchedMembers.size);

      let csvData =
        "userId,userIsBot,hasMigratedUsername,guildMemberNickname,userGlobalName,userUsername,userDiscriminator,pendingGuildMember,guildMemberRoles\n";
      let membersProcessed = 0;
      let membersFound = 0;
      for (const member of fetchedMembers.values()) {
        const {
          nickname,
          pending,
          _roles,
          user: { id, bot, username, discriminator },
        } = member;

        // attempting to get the user.globalName value (introduced by the
        // Discord username migration) but it's not yet available in the
        // Discord.js library...
        // - they literally just added it 9 hours ago (2023/06/08 @ 12:16PM MDT)
        //   after username migration has been happening already, and it's not
        //   yet available as a version
        //   https://github.com/discordjs/discord.js/pull/9512)
        //
        // console.log("member.user:", member.user);
        //// const userGlobalName = member.user.globalName;
        const userGlobalName = "";
        //// const user = await member.user.fetch(true);
        //// const userGlobalName = user.globalName;
        //// console.log("user:", user);

        // if discriminator is "0", then the user has migrated their username
        const hasMigratedUsername = discriminator === "0" ? true : false;

        // Add user if the first 4 digits of `id` exist in the
        // `discriminatorArray`
        const firstFourDigits = id.slice(0, 4);
        if (discriminatorArray.includes(firstFourDigits)) {
          membersFound++;
          const sanitizedNickname = nickname ? nickname.replace(/,/g, "") : ""; // Remove commas from nickname
          const sanitizedRoles = _roles ? `"${_roles.join(",")}"` : ""; // Join roles array into a comma-separated string
          csvData += `${id},${bot},${hasMigratedUsername},${sanitizedNickname},${userGlobalName},${username},${discriminator},${pending},${sanitizedRoles}\n`;
        }
        membersProcessed++;
      }

      console.log("members processed:", membersProcessed);
      console.log("members found in discriminatorArray:", membersFound);
      console.log();

      if (process.env.DEBUG) {
        // if in debug mode, just log the csvData to the console
        console.log(csvData);
        console.log("Finished.");
        process.exit();
      } else {
        // if not in debug mode, write the csvData to a file for later
        // processing
        const formattedDate = new Date().toISOString(); // Format date as 'YYYY-MM-DDThh:mm:ssZ'
        fs.writeFile(
          `guild-${process.env.DISCORD_GUILD_ID}-members_list-${formattedDate}.csv`,
          csvData,
          (err) => {
            if (err) throw err;
            console.log("CSV file created!");
            process.exit();
          }
        );
      }
    });
});

client.login(process.env.DISCORD_APP_TOKEN);
