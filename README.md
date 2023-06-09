# README

Example bot code for getting list of guild members and adding them to a CSV file
if the first 4 digits of the user id is found in the
`discord_user_discriminators.json` array file.

## Project setup:

1. Prep needed:

   - have the bot with the correct `GUILD_MEMBERS` servers member privileged
     intent
   - have the bot added to the NT server
   - get the bot `TOKEN` added to the ENV variable
   - get the NT server ID added to the ENV variable

2. Setup project:

   ```sh
   npm install

   cp .env.sample .env
   # populate ENV variables

   cp src/discord_user_discriminators.json.sample src/discord_user_discriminators.json
   # populate file with discriminators from nttools `Profile` table data
   # (pull the digits out of the `Profile.discordUser` column)
   ```

3. Run 🏃:

   ```sh
   node src/bot_export_guild_members_list.js
   ```

4. The CSV file will be saved to the project root, use that for next steps in
   fixing the `Profile`'s

## TODO:

- **Needed:**

  - [ ] add ability to deal with picking up from where last run ended at for
        when the program ends early (NT server has 41K+ members)
  - [ ] deal with errors that might abruptly stop the code (ie, rate limit,
        network loss, other?)

- **Flair:**
  - [ ] improve console log experience to output progress while it runs
