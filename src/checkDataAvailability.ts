import 'dotenv/config';
import axios from 'axios';
import { cfg } from './config.js';

type DayData = {
  date: string;
  swapCount: number;
  hasData: boolean;
};

function q(v: string) { return `'${v.replace(/'/g, "''")}'`; }

async function hogql<T = any>(query: string): Promise<T> {
  const url = `${cfg.POSTHOG_BASE_URL.replace(/\/$/, '')}/api/projects/${cfg.POSTHOG_PROJECT_ID}/query/`;
  const { data } = await axios.post(
    url,
    { query: { kind: 'HogQLQuery', query } },
    { headers: { Authorization: `Bearer ${cfg.POSTHOG_API_KEY}` } }
  );
  return data;
}

async function checkDataAvailability() {
  console.log('🔍 Checking PostHog data availability...\n');

  // Get the date range of available data
  const rangeQuery = `
    SELECT 
      min(timestamp) as earliest_timestamp,
      max(timestamp) as latest_timestamp,
      count() as total_events
    FROM events 
    WHERE event = ${q(cfg.SWAP_EVENT_NAME)} 
      AND properties.network = ${q(cfg.NETWORK_FILTER)}
  `;

  try {
    const rangeResult = await hogql<{ results: any[] }>(rangeQuery);
    const [earliestTimestamp, latestTimestamp, totalEvents] = rangeResult.results[0];
    
    // Convert timestamps to dates
    const earliestDate = new Date(earliestTimestamp).toISOString().split('T')[0];
    const latestDate = new Date(latestTimestamp).toISOString().split('T')[0];
    
    console.log(`📊 Data Range Summary:`);
    console.log(`   Earliest swap: ${earliestDate}`);
    console.log(`   Latest swap: ${latestDate}`);
    console.log(`   Total events: ${totalEvents.toLocaleString()}`);
    console.log('');

    // Get daily breakdown
    const dailyQuery = `
      SELECT 
        toString(toDate(timestamp)) as date,
        count() as swap_count
      FROM events 
      WHERE event = ${q(cfg.SWAP_EVENT_NAME)} 
        AND properties.network = ${q(cfg.NETWORK_FILTER)}
      GROUP BY toDate(timestamp)
      ORDER BY toDate(timestamp) ASC
    `;

    const dailyResult = await hogql<{ results: any[] }>(dailyQuery);
    const dailyData: DayData[] = dailyResult.results.map(([date, count]) => ({
      date,
      swapCount: count,
      hasData: count > 0
    }));

    console.log(`📅 Daily Data Availability (${dailyData.length} days with data):\n`);

    // Check for gaps
    if (!earliestDate || !latestDate) {
      console.log('❌ No data found or invalid date range');
      return;
    }
    
    const startDate = new Date(earliestDate);
    const endDate = new Date(latestDate);
    const allDays: DayData[] = [];
    
    // Generate all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]!; // Non-null assertion since ISO date always has 'T'
      const dayData = dailyData.find(day => day.date === dateStr);
      
      allDays.push({
        date: dateStr,
        swapCount: dayData?.swapCount || 0,
        hasData: (dayData?.swapCount || 0) > 0
      });
    }

    // Display results
    let gapsFound = 0;
    let consecutiveGaps = 0;
    let maxConsecutiveGaps = 0;
    
    allDays.forEach((day, index) => {
      const status = day.hasData ? '✅' : '❌';
      const countStr = day.hasData ? `${day.swapCount.toLocaleString()} swaps` : 'No data';
      
      console.log(`${status} ${day.date}: ${countStr}`);
      
      if (!day.hasData) {
        gapsFound++;
        consecutiveGaps++;
        maxConsecutiveGaps = Math.max(maxConsecutiveGaps, consecutiveGaps);
      } else {
        consecutiveGaps = 0;
      }
    });

    // Summary
    console.log('\n📋 Data Quality Summary:');
    console.log(`   Total days in range: ${allDays.length}`);
    console.log(`   Days with data: ${allDays.filter(d => d.hasData).length}`);
    console.log(`   Days without data: ${gapsFound}`);
    console.log(`   Data coverage: ${((allDays.filter(d => d.hasData).length / allDays.length) * 100).toFixed(1)}%`);
    console.log(`   Longest gap: ${maxConsecutiveGaps} consecutive days`);

    // Recent activity check (last 7 days)
    const recent7Days = allDays.slice(-7);
    const recentDataDays = recent7Days.filter(d => d.hasData).length;
    
    console.log('\n📈 Recent Activity (Last 7 Days):');
    recent7Days.forEach(day => {
      const status = day.hasData ? '✅' : '❌';
      const countStr = day.hasData ? `${day.swapCount.toLocaleString()} swaps` : 'No data';
      console.log(`   ${status} ${day.date}: ${countStr}`);
    });
    
    console.log(`   Recent coverage: ${recentDataDays}/7 days (${((recentDataDays/7)*100).toFixed(1)}%)`);

    // Data quality recommendations
    console.log('\n💡 Recommendations:');
    if (gapsFound === 0) {
      console.log('   🎉 Perfect data coverage! No gaps found.');
    } else if (gapsFound <= 2) {
      console.log('   ✅ Excellent data coverage with minimal gaps.');
    } else if (gapsFound <= 5) {
      console.log('   ⚠️  Good data coverage, but consider investigating gaps.');
    } else {
      console.log('   🚨 Significant data gaps found. Review data collection process.');
    }

    if (recentDataDays < 7) {
      console.log('   🚨 Recent data missing! Check if data collection is still active.');
    }

  } catch (error: any) {
    console.error('❌ Error checking data availability:');
    if (error?.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

checkDataAvailability();
