# IndexNow (Bing, Yandex, Seznam, and AI search that reads their indexes)

The key lives in `src/config/brand.ts` as `INDEXNOW_KEY`. The build writes
`dist/<key>.txt` containing exactly that key, which is how the search engines
verify a submission belongs to this site.

Verify after a publish:

    https://revvin.co/b7f4a1c93e5d42f8ab6c05719d3e8a42.txt

## Pinging on publish

Lovable hosting has no publish webhook and no server side build hook we can run
after a deploy, so the ping is manual for now. One URL per request:

    https://api.indexnow.org/indexnow?url=https://revvin.co/pricing&key=b7f4a1c93e5d42f8ab6c05719d3e8a42

A batch of URLs (up to 10,000 per request):

    curl -X POST https://api.indexnow.org/indexnow \
      -H "Content-Type: application/json" \
      -d '{
        "host": "revvin.co",
        "key": "b7f4a1c93e5d42f8ab6c05719d3e8a42",
        "keyLocation": "https://revvin.co/b7f4a1c93e5d42f8ab6c05719d3e8a42.txt",
        "urlList": ["https://revvin.co/", "https://revvin.co/pricing"]
      }'

A 200 or 202 response means accepted. Submit only URLs that actually changed.

If a serverless ping is wanted later, an edge function can do the POST above and
be called after each publish; nothing in the site depends on that today.
