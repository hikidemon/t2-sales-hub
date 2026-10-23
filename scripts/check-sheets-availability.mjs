/**
 * Checks the Google Sheets availability probe directly.
 */

const id = process.argv[2] ?? '1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw';
const gid = process.argv[3] ?? '515868842';

const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;

console.log('url:', url);

try {
  const response = await fetch(url, { redirect: 'follow' });
  console.log('status:', response.status, response.statusText);
  const body = await response.text();
  console.log('body length:', body.length);
  console.log('body head:', body.slice(0, 200).replace(/\n/g, ' | '));
} catch (error) {
  console.log('ERROR:', error.message);
}
