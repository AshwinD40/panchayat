import * as Location from 'expo-location';

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async () => {
  try {
    const granted = await requestLocationPermission();
    if (!granted) return null;
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  } catch (error) {
    return null;
  }
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results && results.length > 0) {
      const r = results[0];
      return r.city || r.district || r.subregion || r.region || 'Unknown Area';
    }
    return 'Unknown Area';
  } catch (error) {
    return 'Unknown Area';
  }
};

export const INDIAN_CITIES = [
  'Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar',
  'Mumbai','Pune','Nagpur','Nashik','Thane','Aurangabad',
  'Delhi','Noida','Gurugram','Faridabad','Ghaziabad',
  'Bengaluru','Mysuru','Hubli','Mangaluru','Belagavi',
  'Hyderabad','Warangal','Nizamabad','Karimnagar',
  'Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem',
  'Kolkata','Howrah','Durgapur','Asansol',
  'Jaipur','Jodhpur','Kota','Bikaner','Udaipur',
  'Lucknow','Kanpur','Agra','Varanasi','Prayagraj','Meerut',
  'Bhopal','Indore','Jabalpur','Gwalior',
  'Patna','Gaya','Muzaffarpur',
  'Chandigarh','Ludhiana','Amritsar','Jalandhar',
  'Bhubaneswar','Cuttack','Rourkela',
  'Guwahati','Dibrugarh',
  'Kochi','Thiruvananthapuram','Kozhikode','Thrissur',
];