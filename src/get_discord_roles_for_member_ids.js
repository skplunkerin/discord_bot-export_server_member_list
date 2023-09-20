const { Client, Events, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.GuildMembers],
});

/**
 * Finds the local file with the given name and returns the file data as a
 * string.
 *
 * @param {string} filePath - The path to the JSON file to read.
 * @returns {string} - The file data as a string.
 */
function readFile(filePath) {
  try {
    const absolutePath = path.resolve(__dirname, filePath);
    // Read the file as text
    const fileData = fs.readFileSync(absolutePath, "utf-8");
    return fileData;
  } catch (error) {
    console.error("Error reading file:", error);
    return "";
  }
}

/**
 * Loops through array of user objects (containing id (profileId) and
 * discordUserId), searches Discord Guild for roles belonging to this user,
 * checks if the found user has any Discord roles that match a list of known
 * roles, and if found saves a SQL upsert query for the `profileId` and
 * `discordRoleId` relationship.
 */
client.once(Events.ClientReady, async () => {
  const guild = client.guilds.resolve(process.env.DISCORD_GUILD_ID);
  const formattedDate = new Date().toISOString(); // Format date as 'YYYY-MM-DDThh:mm:ssZ'
  const fileName = `upsert_profile_discord_roles-${formattedDate}.sql`;

  // Initialize the file with a header
  fs.writeFileSync(
    fileName,
    `/**
  * NOTE: The profile-to-discordRole association format
  * for table \`_DiscordRoleToProfile\` \`("A", "B")\` is:
  * - \`VALUES (:discord_role_id, :profile_id)\`
  */\n`
  );

  // Parse JSON data into an array of User objects and discordRoles array
  const discordRoles = JSON.parse(readFile("jsons/discord_role_ids.json"));
  const users = JSON.parse(
    readFile("jsons/profile_ids-server_member_ids.json")
  );

  // loop through the users from the JSON file
  for (const user of users) {
    const { id: profileId, discordUserId } = user;
    console.log("Profile.id:", profileId);
    console.log("Profile.discordUserId:", discordUserId);
    // get the member from the Discord Guild
    try {
      const member = await guild.members.fetch(discordUserId);
      console.log("found member.user.username:", member.user.username);
      // Append the username to the file
      fs.appendFileSync(
        fileName,
        `/***** ${member.user.username} Profile DiscordRoles SQL *****/\n`
      );

      // loop through member roles and if the role exists in `discordRoles`
      // create the upsert SQL query for it:
      for (const roleId of member._roles) {
        if (discordRoles[roleId]) {
          console.log(
            `\tfound roleId: ${roleId}\t(${discordRoles[roleId].name})`
          );
          // Append the SQL query to file
          fs.appendFileSync(
            fileName,
            // profile/discordRole format:
            //   `VALUES (:discord_role_id, :profile_id)`
            `INSERT INTO "public"."_DiscordRoleToProfile" ("A", "B")
VALUES (${discordRoles[roleId].discordRoleId}, ${profileId})
ON CONFLICT ("A", "B") DO NOTHING
;\n`
          );
        }
      }
      // Append the username to the file
      fs.appendFileSync(
        fileName,
        `/***** End queries for ${member.user.username} *****/\n`
      );
    } catch (error) {
      console.error("Error fetching member:", error);
      console.log("-----");
      break;
    }
    console.log("-----");
  }

  process.exit();
});

client.login(process.env.DISCORD_APP_TOKEN);
