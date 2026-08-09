import React from "react";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";

const center = { lat: 19.0760, lng: 72.8777 };

function Map({ form, setForm }) {
  return (
    <LoadScript googleMapsApiKey="YOUR_API_KEY">
      <GoogleMap
        center={{ lat: form.latitude, lng: form.longitude }}
        zoom={10}
        mapContainerStyle={{ width: "100%", height: "200px" }}
        onClick={(e) => {
          setForm({
            ...form,
            latitude: e.latLng.lat(),
            longitude: e.latLng.lng()
          });
        }}
      >
        <Marker position={{ lat: form.latitude, lng: form.longitude }} />
      </GoogleMap>
    </LoadScript>
  );
}

export default Map;