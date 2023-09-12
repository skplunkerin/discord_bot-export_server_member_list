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

// TODO: remove this test code. [skplunkerin]
// Parse JSON data into an array of User objects
const users = JSON.parse(readFile("profile_ids-server_member_ids.json"));
console.log("users:", users);
// Loop through the users array and update each object
for (const user of users) {
  user.roles = ["string1", "string2"];
}
console.log("users:", users);

/**
 * Loops through array of user objects (containing id and discordUserId),
 * searches Discord Guild for roles belonging to the user, and returns an
 * updated users array containing found roles array added to each user object.
 *
 * @param {Array<{ id: number, discordUserId: string }>} users - The array of user objects.
 * @returns {Array<{ id: number, discordUserId: string, roles?: string[] }>} - Updated array of user objects.
 */
function findRolesForUsers(users) {
  let processedCount = 0;
  users.forEach((user) => {
    const { id, discordUserId } = user;
    processedCount++;
  });
  console.log("\tusers found:", processedCount);
  console.log();
  return csvData;
}

/**
 * Creates a CSV file with the given CSV data using the following filename:
 *
 *  ```
 *  guildId_{discordGuildId}-roleName_{discordRoleName}-roleId_{discordRoleId}-members_list_{YYYY-MM-DDThh:mm:ssZ}.csv
 *  ```
 *
 * NOTE: if `DEBUG` mode is set to `true` in the .env file, the CSV data is
 * logged to the console instead of written to a file.
 *
 * @param {string} guildId is the Discord Guild (server) ID for the CSV data
 * @param {string} roleId is the Discord server Role ID for the CSV data
 * @param {string} roleName is the Discord server Role name for the CSV data
 * @param {string} csvData is a string of CSV data to save to a file
 */
async function createCsvFile(guildId, roleId, roleName, csvData) {
  const formattedDate = new Date().toISOString(); // Format date as 'YYYY-MM-DDThh:mm:ssZ'
  const fileName = `guildId_${guildId}-roleName_${roleName}-roleId_${roleId}-members_list_${formattedDate}.csv`;
  if (process.env.DEBUG) {
    // if in debug mode, just log the csvData to the console
    console.log(`${fileName} data:`);
    console.log(csvData);
  } else {
    // if not in debug mode, write the csvData to a file for later
    // processing
    fs.writeFile(fileName, csvData, (err) => {
      if (err) throw err;
      console.log("\tCSV file created!");
    });
  }
}

/**
 * Creates a CSV file for each Discord Role ID containing the Guild Members with
 * that role.
 * NOTES:
 *   - If the role ID has no members, a CSV file is still created.
 *   - If the role ID is not found, no CSV file is created.
 *
 * @param {Guild} guild is the Discord Guild object
 * @param {string[]} roleIds is an array of Discord Role IDs from the .env file
 */
async function createCsvFilesForRoleIds(guild, roleIds) {
  console.log("createCsvFilesForRoleIds() called...");
  for (const roleId of roleIds) {
    try {
      console.log("\troleId:", roleId);
      // NOTE: this should work but isn't, not sure if it's a permission
      // issue, a bug, or I'm doing something wrong:
      // guild.roles.cache.get(roleId)
      //
      // this successfully gets the role but not the role member data; see below
      // `guild.members.fetch()` which seems to populate it just for this role.
      // (so intuitive, right?)
      const role = await guild.roles.fetch(roleId);
      if (role) {
        console.log(`\tRole: ${role.name}`);
        // NOTE: `role.members` has no data unless `guild.members.fetch()` is
        // called first:
        await guild.members.fetch();
        const members = role.members;
        console.log("\tMembers with role:", members.size);
        const csvData = getCsvDataForMembers(members);
        await createCsvFile(
          process.env.DISCORD_GUILD_ID,
          roleId,
          role.name,
          csvData
        );
      } else {
        console.log("\tRole not found.");
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }
  console.log("...finished createCsvFilesForRoleIds()");
}

client.once(Events.ClientReady, async () => {
  console.log(process.env.DEBUG ? "Debugging...\n" : "Creating CSV file...\n");
  const guild = client.guilds.resolve(process.env.DISCORD_GUILD_ID);
  await createCsvFilesForRoleIds(
    guild,
    process.env.DISCORD_ROLES.split(",")
  ).then(() => {
    if (process.env.DEBUG) {
      console.log("Finished");
    } else {
      console.log("Files created");
    }
    // Can't close this as it'll close before the last role file finishes
    // writing everything.
    // process.exit();
  });
});

client.login(process.env.DISCORD_APP_TOKEN);
