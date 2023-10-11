## Download PrairieLearn Assessments

This script can be used to comply with accreditation requirements. It generates:

- A general view of all assessments;
- An overview of each assessment, its questions, and a proposed solution;
- For a subset of pre-selected students (e.g., average, below average, above average):
  - An overview of their assessments;
  - An overview of each assessment, its questions, and submitted answers (as PDF and downloaded) with grades.

To configure the settings of the script, a config.json file must be created as follows:

```json
{
  "AUTHN_TOKEN": "XXXX",
  "SERVER": "ca.prairielearn.com",
  "COURSE_INSTANCE_ID": 99999,
  "STUDENT_UID": {
    "below_average": "UID1",
    "above_average": "UID2",
    "average": "UID3"
  },
  "ASSESSMENTS_IGNORE": "^P[MQ]"
}
```

- `AUTHN_TOKEN` is an authentication token. After logging into PrairieLearn in a regular browser, open the Developer Tools, go to the Application tab, select cookies, select the PrairieLearn server, then find the `pl_authn` cookie. Double-click the value of the cookie, copy, and paste it in this config option.
- `SERVER` is the server where PrairieLearn is running. Typically this will be `us.prairielearn.com`, `ca.prairielearn.com`, or a University-specific server.
- `COURSE_INSTANCE_ID` is the ID of the course instance to be retrieved. This can be identified by opening the course instance in a browser, and checking the URL. The instance ID is the one that follows `/course_instance/` in the URL.
- `STUDENT_UID` contains a set of students that should be used as samples for exporting. Each record should contain an identifier and the UID of the student to be used for that sample.
- `ASSESSMENTS_IGNORE` corresponds to a regular expression for the assessments that should be ignored (e.g., practice versions of the assessments, worksheets, etc.).

Run `yarn` to install dependencies, and `yarn start` to execute the script.
