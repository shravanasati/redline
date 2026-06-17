export async function getLocationFromIP(ipAddr: string) {
    try {
        const resp = await fetch(`http://ip-api.com/json/${ipAddr}`)
        const jsonResp = await resp.json()
        if (!jsonResp || jsonResp.status !== "success") {
            return "Unknown Location";
        }
        const { country, regionName, city } = jsonResp
        return `${city}, ${regionName}, ${country}`;
    } catch (err) {
        console.error("Error fetching location from IP:", err);
        return "Unknown Location";
    }
}