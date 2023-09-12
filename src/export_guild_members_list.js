const { Client, Events, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.GuildMembers],
});

/**
 * Loops through a Discord Collection of GuildMember objects and returns them as
 * a CSV string with the following headers:
 *   ```
 *   userId,userIsBot,hasMigratedUsername,guildMemberNickname,userGlobalName,userUsername,userDiscriminator,pendingGuildMember,guildMemberRoles
 *   ```
 *
 * @param {Collection<string, GuildMember>} members discord Collection of GuildMember objects
 * @returns {string} members in as a string of CSV data
 */
function getCsvDataForMembers(members) {
  let csvData =
    "userId,userIsBot,hasMigratedUsername,guildMemberNickname,userGlobalName,userUsername,userDiscriminator,pendingGuildMember,guildMemberRoles\n";
  let membersProcessed = 0;
  members.forEach((member) => {
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
    const hasMigratedUsername = discriminator === "0";
    // Wrap all names in quotes if they have a comma in them to prevent commas
    // from breaking the CSV format
    let quotedNickname = nickname ? nickname : "";
    if (quotedNickname.includes(",")) {
      quotedNickname = `"${quotedNickname}"`;
    }
    let quotedUserGlobalName = userGlobalName ? userGlobalName : "";
    if (quotedUserGlobalName.includes(",")) {
      quotedUserGlobalName = `"${quotedUserGlobalName}"`;
    }
    let quotedUsername = username ? username : "";
    if (quotedUsername.includes(",")) {
      quotedUsername = `"${quotedUsername}"`;
    }
    // Join roles array into a comma-separated string and wrap in quotes to
    // prevent commas from breaking the CSV format
    const joinedRoles = _roles ? `"${_roles.join(",")}"` : "";

    // create the csvData row for this member
    csvData += `${id},${bot},${hasMigratedUsername},${quotedNickname},${quotedUserGlobalName},${quotedUsername},${discriminator},${pending},${joinedRoles}\n`;
    membersProcessed++;
  });
  console.log("\tmembers processed:", membersProcessed);
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
