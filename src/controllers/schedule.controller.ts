import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import ejs from "ejs";
import { scheduleTweets } from "../jobs/tweet.job";

// Path to the schedule configuration file
const CONFIG_PATH = join(import.meta.dir, "../../data/schedule.json");

export class ScheduleController {
  /**
   * Helper method to sort schedule by time
   */
  private static sortSchedule(schedule: any) {
    const sortedEntries = Object.entries(schedule.schedule).sort(([timeA], [timeB]) => timeA.localeCompare(timeB));
    schedule.schedule = Object.fromEntries(sortedEntries);
    return schedule;
  }

  /**
   * Get the current schedule configuration
   */
  static async getSchedule(c: any) {
    try {
      const data = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

      // First render the scheduler content
      const schedulerContent = await ejs.renderFile(join(import.meta.dir, "../../views/scheduler.ejs"), {
        title: "Scheduler",
        schedule: data,
      });

      // Then inject it into the layout
      const html = await ejs.renderFile(join(import.meta.dir, "../../views/layout.ejs"), {
        title: "Scheduler",
        body: schedulerContent,
        path: c.req.path,
      });

      return c.html(html);
    } catch (error) {
      throw new Error("Failed to read schedule configuration");
    }
  }

  /**
   * Update the schedule configuration
   * @param scheduleData - The new schedule data to write
   */
  static async updateConfig(c: any) {
    try {
      const { config: configData } = await c.req.json();
      // Validate the structure
      if (!configData || !configData.persona || !configData.maxLength || !configData.timezone) {
        throw new Error("Invalid config format");
      }

      // Read current schedule
      const data = readFileSync(CONFIG_PATH, "utf8");
      const schedule = JSON.parse(data);

      // Update only the config
      schedule.config = configData;

      // Write back to file
      writeFileSync(CONFIG_PATH, JSON.stringify(schedule, null, 2), "utf8");

      // Restart the scheduler
      scheduleTweets();

      return c.json({ message: "Config updated successfully" });
    } catch (error: any) {
      throw new Error(`Failed to update config: ${error.message}`);
    }
  }

  /**
   * Update a single time record in the schedule
   * @param time - The time key to update (e.g. "00:00")
   * @param record - The new record data
   */
  static async updateTimeRecord(c: any) {
    try {
      const { oldTime, time, record } = await c.req.json();

      if (!time || !record || !record.type || !record.instruction) {
        throw new Error("Invalid time record format");
      }

      // Read current schedule
      const data = readFileSync(CONFIG_PATH, "utf8");
      const schedule = JSON.parse(data);

      // Update the specific time record
      if (oldTime && schedule.schedule[oldTime]) {
        delete schedule.schedule[oldTime];
      }
      schedule.schedule[time] = record;

      const sortedSchedule = ScheduleController.sortSchedule(schedule);

      // Write back to file
      writeFileSync(CONFIG_PATH, JSON.stringify(sortedSchedule, null, 2), "utf8");

      // Restart the scheduler
      scheduleTweets();

      return c.json({ message: "Time record updated successfully" });
    } catch (error) {
      throw new Error("Failed to update time record");
    }
  }

  /**
   * Delete a single time record from the schedule
   * @param time - The time key to delete (e.g. "00:00")
   */
  static async deleteTimeRecord(c: any) {
    try {
      const { time } = await c.req.json();

      if (!time) {
        throw new Error("Time parameter is required");
      }

      // Read current schedule
      const data = readFileSync(CONFIG_PATH, "utf8");
      const schedule = JSON.parse(data);

      // Delete the specific time record
      if (schedule.schedule[time]) {
        delete schedule.schedule[time];
      } else {
        throw new Error("Time record not found");
      }

      // Write back to file
      writeFileSync(CONFIG_PATH, JSON.stringify(schedule, null, 2), "utf8");

      // Restart the scheduler
      scheduleTweets();

      return c.json({ message: "Time record deleted successfully" });
    } catch (error) {
      throw new Error("Failed to delete time record");
    }
  }
}
