const locations = [
  {lat: 7.2906, lng: 80.6337, city: 'Kandy'},
  {lat: 6.9271, lng: 79.8612, city: 'Colombo'},
  {lat: 5.9488, lng: 80.5353, city: 'Matara'},
  {lat: 6.0535, lng: 80.2210, city: 'Galle'},
  {lat: 9.6615, lng: 80.0255, city: 'Jaffna'},
  {lat: 8.5874, lng: 81.2152, city: 'Trincomalee'},
  {lat: 7.2081, lng: 79.8358, city: 'Negombo'},
  {lat: 8.3114, lng: 80.4037, city: 'Anuradhapura'},
];

const sellers = db.sellers.find({}).toArray();
let i = 0;
sellers.forEach(function(s) {
  const loc = locations[i % locations.length];
  const update = { $set: { addressLocation: { lat: loc.lat, lng: loc.lng, city: loc.city, verified: true, formattedAddress: loc.city + ', Sri Lanka' } } };
  db.sellers.updateOne({_id: s._id}, update);
  print('Seeded: ' + s.shopName + ' -> ' + loc.city + ' (' + loc.lat + ', ' + loc.lng + ')');
  i++;
});
print('Done. Total seeded: ' + i);
