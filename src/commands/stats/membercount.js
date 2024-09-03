const { EmbedBuilder } = require("discord.js");
const QuickChart = require('quickchart-js');

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "membercount",
  description: "Shows the number of members on the server.",
  category: "STATS",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: [],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = await getChartEmbed(message.guild);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await getChartEmbed(interaction.guild);
    await interaction.followUp(response);
  },
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
                text: `${guild.name} Members Count`
            }
        }
    },
  }).setWidth(500).setHeight(300).setBackgroundColor('#151515');

  const chartUrl = await chart.getShortUrl();

  const embed = new EmbedBuilder()
    .setTitle(`📊 │ Member Count`)
    .setColor('#e74c3c')  // Custom color directly in the code
    .setFooter({ text: guild.client.user.username, iconURL: guild.client.user.avatarURL() })
    .setDescription(`**Total:** ${totalMembers}\n**Members:** ${humanMembers}\n**Bots:** ${botMembers}\n**Joined Last 24h:** ${last24Hours}\n**Joined Last 7 Days:** ${last7Days}`)
    .setImage(chartUrl);

  return { embeds: [embed] };
}
