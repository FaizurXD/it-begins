const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas'); // Install canvas module: npm install canvas

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Set up the verification process.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configure the verification system.')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel where the verification process will occur.')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Select the verification type.')
            .setRequired(true)
            .addChoices(
              { name: 'Captcha Verification', value: 'captcha' },
              { name: 'One-Click Verification', value: 'click' }
            ))
        .addRoleOption(option =>
          option
            .setName('verified_role')
            .setDescription('The role that will be given to verified users.')
            .setRequired(true))
        .addRoleOption(option =>
          option
            .setName('unverified_role')
            .setDescription('The role that will be given to unverified users.')
            .setRequired(false))
    ),
  category: "UTILITY", // Add the category field here

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const verificationType = interaction.options.getString('type');
    const verifiedRole = interaction.options.getRole('verified_role');
    const unverifiedRole = interaction.options.getRole('unverified_role');

    const guildId = interaction.guild.id;
    const verificationSettings = {
      channelId: channel.id,
      type: verificationType,
      verifiedRoleId: verifiedRole.id,
      unverifiedRoleId: unverifiedRole ? unverifiedRole.id : null
    };

    await interaction.reply({
      content: 'Verification system has been successfully set up.',
      ephemeral: true
    });

    if (unverifiedRole) {
      interaction.client.on('guildMemberAdd', async (member) => {
        await member.roles.add(unverifiedRole);
        const guildChannels = interaction.guild.channels.cache.filter(c => c.id !== channel.id);
        guildChannels.forEach(async (c) => {
          await c.permissionOverwrites.edit(unverifiedRole, { ViewChannel: false });
        });
        await channel.permissionOverwrites.edit(unverifiedRole, { ViewChannel: true });
      });
    }

    const verifyCommand = async (interaction) => {
      if (verificationType === 'captcha') {
        const captcha = generateCaptcha(6);
        const captchaImageBuffer = await createCaptchaImage(captcha);

        const captchaEmbed = new EmbedBuilder()
          .setTitle('Verification Process')
          .setDescription('Please solve the captcha to get verified.')
          .setImage('attachment://captcha.png')
          .setColor('#3498db');

        const captchaAttachment = new AttachmentBuilder(captchaImageBuffer, { name: 'captcha.png' });

        const button = new ButtonBuilder()
          .setCustomId('verify_captcha')
          .setLabel('Submit Captcha')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const verificationMessage = await interaction.reply({
          embeds: [captchaEmbed],
          files: [captchaAttachment],
          components: [row],
          ephemeral: true
        });

        const filter = (i) => i.customId === 'verify_captcha' && i.user.id === interaction.user.id;
        const collector = verificationMessage.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async (i) => {
          const response = await awaitResponseFromUser(interaction);
          if (response && response.content.toLowerCase() === captcha.toLowerCase()) {
            await handleUserVerification(interaction, verifiedRole, unverifiedRole);
          } else {
            await i.update({
              content: 'The captcha was incorrect or not entered in time. Please try again.',
              components: [],
              embeds: []
            });
          }
        });

      } else if (verificationType === 'click') {
        const embed = new EmbedBuilder()
          .setTitle('Verification Process')
          .setDescription('Click the button below to get verified.')
          .setColor('#2ecc71');

        const button = new ButtonBuilder()
          .setCustomId('verify_click')
          .setLabel('Verify Me')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        const verificationMessage = await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });

        const filter = (i) => i.customId === 'verify_click' && i.user.id === interaction.user.id;
        const collector = verificationMessage.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async (i) => {
          await handleUserVerification(interaction, verifiedRole, unverifiedRole);
        });
      }
    };

    interaction.client.on('interactionCreate', (interaction) => {
      if (interaction.commandName === 'verify') {
        verifyCommand(interaction);
      }
    });
  }
};

async function handleUserVerification(interaction, verifiedRole, unverifiedRole) {
  const member = interaction.guild.members.cache.get(interaction.user.id);
  await member.roles.add(verifiedRole);
  if (unverifiedRole) {
    await member.roles.remove(unverifiedRole);
  }
  await interaction.followUp({
    content: 'You have been successfully verified!',
    ephemeral: true
  });

  const guildChannels = interaction.guild.channels.cache.filter(c => c.id !== interaction.channel.id);
  guildChannels.forEach(async (c) => {
    await c.permissionOverwrites.edit(verifiedRole, { ViewChannel: true });
  });
}

function generateCaptcha(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let captcha = '';
  for (let i = 0; i < length; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
}

async function createCaptchaImage(captcha) {
  const canvas = Canvas.createCanvas(200, 100);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '40px Sans';
  ctx.fillStyle = '#fff';
  ctx.fillText(captcha, 50, 60);

  return canvas.toBuffer('image/png');
}

async function awaitResponseFromUser(interaction) {
  const filter = (msg) => msg.author.id === interaction.user.id;
  const response = await interaction.channel.awaitMessages({ filter, max: 1, time: 120000, errors: ['time'] }).catch(() => null);
  return response ? response.first() : null;
                                                            }
