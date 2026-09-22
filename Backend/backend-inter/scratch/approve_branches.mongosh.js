// Seed script: approve all existing branches and assign geographic coordinates
const branchCoords = {
  'Colombo': {lat: 6.9271, lng: 79.8612},
  'Kandy':   {lat: 7.2906, lng: 80.6337},
  'Galle':   {lat: 6.0535, lng: 80.2210},
  'Matara':  {lat: 5.9488, lng: 80.5353},
  'Jaffna':  {lat: 9.6615, lng: 80.0255},
  'Kurunegala': {lat: 7.4869, lng: 80.3647},
  'Anuradhapura': {lat: 8.3114, lng: 80.4037},
  'Negombo': {lat: 7.2081, lng: 79.8358},
};

const defaultCoords = [
  {lat: 6.9271, lng: 79.8612},
  {lat: 7.2906, lng: 80.6337},
  {lat: 6.0535, lng: 80.2210},
  {lat: 5.9488, lng: 80.5353},
];

const branches = db.courierbranches.find({}).toArray();
print('Found ' + branches.length + ' branches');

let i = 0;
branches.forEach(function(b) {
  const cityKey = Object.keys(branchCoords).find(function(c) {
    return (b.city || '').toLowerCase().includes(c.toLowerCase()) ||
           (b.branchName || '').toLowerCase().includes(c.toLowerCase());
  });
  const coords = cityKey ? branchCoords[cityKey] : defaultCoords[i % defaultCoords.length];
  
  db.courierbranches.updateOne(
    {_id: b._id},
    {$set: {status: 'approved', location: {lat: coords.lat, lng: coords.lng}}}
  );
  print('  ✅ Approved + seeded: ' + b.branchName + ' (' + b.city + ') -> ' + coords.lat + ', ' + coords.lng);
  i++;
});
print('Done. Approved ' + i + ' branches.');
