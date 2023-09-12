# README

Example bot code for getting list of guild role members and adding them to a CSV
file.

## Project setup:

1. Prep needed:

   - have the bot with the correct `GUILD_MEMBERS` servers member privileged
     intent
   - make sure the bot is added to the Discord server you need members for
   - get the bot `TOKEN` added to the ENV variable
   - get the Discord Guild (server) ID added to the ENV variable
   - get the Discord server Role ID(s) added to the ENV variable

2. Setup project:

   ```sh
   npm install

   cp .env.sample .env
   # populate ENV variables
   ```

3. Run 🏃:

   ```sh
   # Export list of guild members in CSV
   node src/export_guild_members_list.js

   # Get list of all Discord server roles for given userId
   node src/get_discord_roles_for_member_ids.js
   ```

4. If the Role is found a CSV file will be saved containing any members with the
   role (empty file means no members with the role were found).

   The CSV headers in the file are:

   ```csv
   userId,userIsBot,hasMigratedUsername,guildMemberNickname,userGlobalName,userUsername,userDiscriminator,pendingGuildMember,guildMemberRoles
   ```

## TODO:

- **Needed:**

  - [ ] add ability to deal with picking up from where last run ended at for
        when the program ends early (i.e. if any errors happen)
  - [ ] deal with errors that might abruptly stop the code (ie, rate limit,
        network loss, other?)

- **Flair:**
  - [ ] improve console log experience to output progress while it runs
