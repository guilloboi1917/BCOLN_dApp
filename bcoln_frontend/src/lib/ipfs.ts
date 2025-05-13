// lib/ipfs.ts
"use client";

/**
 * Stores string data as an IPFS block
 * @param data String data to store (typically stringified JSON)
 * @param options Optional parameters for block storage
 * @returns CID of the stored block
 */
export async function putToIPFS(
  data: string,
  options: {
    cidCodec?: string;
    mhtype?: string;
    pin?: boolean;
  } = {}
): Promise<string> {
  const formData = new FormData();
  formData.append('data', new Blob([data], { type: 'application/json' }));

  // Configure query parameters
  const params = new URLSearchParams();
  if (options.cidCodec) params.set('cid-codec', options.cidCodec);
  if (options.mhtype) params.set('mhtype', options.mhtype);
  if (options.pin !== undefined) params.set('pin', options.pin.toString());

  try {
    const response = await fetch(
      `http://127.0.0.1:5001/api/v0/block/put?${params.toString()}`,
      {
        method: 'POST',
        body: formData,
        // Let browser set Content-Type with boundary
        headers: {}
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IPFS block/put failed: ${error}`);
    }

    const { Key: cid } = await response.json();
    return cid;
  } catch (error) {
    console.error('IPFS put error:', error);
    throw error;
  }
}

/**
 * Retrieves data from IPFS by CID
 * @param cid Content identifier of the data
 * @returns The stored string data
 */
export async function getFromIPFS(cid: string): Promise<string> {
  try {
    const response = await fetch(
      `http://127.0.0.1:5001/api/v0/block/get?arg=${cid}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IPFS block/get failed: ${error}`);
    }

    return await response.text();
  } catch (error) {
    console.error('IPFS get error:', error);
    throw error;
  }
}

// Helper function for JSON data
export const putJSONToIPFS = async (obj: any) => {
  return putToIPFS(JSON.stringify(obj), {
    cidCodec: 'dag-json',
    mhtype: 'sha2-256',
    pin: true
  });
};

export const getJSONFromIPFS = async (cid: string) => {
  if (cid == "") return { data: "empty" };
  const data = await getFromIPFS(cid);
  return JSON.parse(data);
};