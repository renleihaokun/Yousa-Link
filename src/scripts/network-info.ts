export type NetworkInfo = {
  ip?: string;
  location?: {
    city?: string;
    region?: string;
  };
};

let request: Promise<NetworkInfo> | undefined;

export function getNetworkInfo() {
  request ??= fetch('https://ip.nemui.cn/api/ip').then((response) => {
    if (!response.ok) throw new Error(`Network lookup failed: ${response.status}`);
    return response.json() as Promise<NetworkInfo>;
  });
  return request;
}
