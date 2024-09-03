const { EmbedBuilder } = require("discord.js");
const QuickChart = require('quickchart-js');
const { EMBED_COLORS } = require("@root/config.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "membercount",
  description: "Shows the number of members on the server.",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks"],
  cooldown: 20,
  command: {
    enabled: true,
    aliases: [],
    usage: "", // Add usage details if needed
  },
  slashCommand: {
    enabled: true,
    options: [], // Add slash command options if needed
  },

  async messageRun(message) {
    const embed = await getChartEmbed(message.guild);
    await message.reply({ embeds: [embed] });
  },

  async interactionRun(interaction) {
    const embed = await getChartEmbed(interaction.guild);
    await interaction.followUp({ embeds: [embed] });
  }
};

/**
 * @param {import("discord.js").Guild} guild 
 */
async function getChartEmbed(guild) {
  const totalMembers = guild.memberCount;
  const botMembers = guild.members.cache.filter(member => member.user.bot).size;
  const humanMembers = totalMembers - botMembers;
  const last24Hours = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 24 * 60 * 60 * 1000).size;
  const last7Days = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 7 * 24 * 60 * 60 * 1000).size;

  const chart = new QuickChart();
  chart.setConfig({
    type: 'bar',
    data: {
      labels: ['Total', 'Members', 'Bots', '24h', '7 days'],
      datasets: [{
        label: 'Member Count',
        data: [totalMembers, humanMembers, botMembers, last24Hours, last7Days],
        backgroundColor: ['#36a2eb', '#ffce56', '#ff6384', '#cc65fe', '#66ff99']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${guild.name} members count`
        }
      }
    },
  }).setWidth(500).setHeight(300).setBackgroundColor('#151515');

  const chartUrl = await chart.getShortUrl();
  const embed = new EmbedBuilder()
    .setTitle(`📊 | MEMBER COUNT`)
    .setColor(EMBED_COLORS.INFO)
    .setFooter({ text: guild.client.user.username, iconURL: guild.client.user.avatarURL() })
    .setDescription(`Total: **${totalMembers}**\nMembers: **${humanMembers}**\nBots: **${botMembers}**\nLast 24h: **${last24Hours}**\nLast 7 days: **${last7Days}**`)
    .setImage(chartUrl);

  return embed;
}
