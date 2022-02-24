import React, { useState } from "react";
import './App.css';
require('dotenv').config()

const axios = require('axios');
const dealsApiURL = process.env.REACT_APP_API_URL;
const imageServerURL = process.env.REACT_APP_IMAGE_DETECTION_URL

function App() {

  const [selectedImage, setSelectedImage] = useState(null);
  // const [selectedImageName, setSelectedImageName] = useState("");
  const [orgList, setOrgList] = useState([]);
  const [identifiedImg, setIdentifiedImg] = useState("");
  console.log(dealsApiURL);

  function imageUpload(file, fileName) {

    const formData = new FormData();
    formData.append('myImage', file);
    const config = {
      headers: {
        'content-type': 'multipart/form-data'
      }
    };

    //authorization: tiPdu4GGea&*)*%RjL9vc1gAWIegmk6m2tV!@SR@
    axios.post(imageServerURL+"logo-upload", formData, config)
      .then((response) => {
        console.log(response.data);
        if (response.data && response.data.length > 0) {
          let logoName = response.data[0].description;
          setIdentifiedImg(logoName);
          imageSearch(logoName);
        }
        alert("The file is successfully uploaded");
      }).catch((error) => {
      });


    alert("upload will process here");
  }

  function imageSearch(logoName) {
    const imgApiConfig = {
      headers: {
        'authorization': 'tiPdu4GGea&*)*%RjL9vc1gAWIegmk6m2tV!@SR@'
      }
    };

    axios.post(dealsApiURL+"imageSearch/byLogoName", { logoName: logoName }, imgApiConfig)
      .then((response) => {
        setOrgList(response.data)
        console.log(response.data);
      });
  }


  return (
    <div className="App">
      <p>Image Detection</p>
      {/* <input type="file" ></input> */}
      <input type="file" accept="image/*;capture=camera" name="logo" onChange={(event) => {
        setSelectedImage(event.target.files[0]);
        // setSelectedImageName(event.target.files[0].name);
        imageUpload(event.target.files[0], event.target.files[0].name);
      }} />
      {selectedImage && (
        <div>
          <br />
          <img alt="not fount" width={"100px"} src={URL.createObjectURL(selectedImage)} />
          <br />
          <p>Logo identified as: {identifiedImg}</p>
          {/* <button onClick={() => { setSelectedImage(null); setSelectedImageName(''); }}>Remove</button> */}
        </div>
      )}
      {/* {orgList} */}
      <div className="org-list">
        {
          orgList.map((item, index) => {
            return <div key={item.OrgId}><br/><span>{item.OrganisationName} - {item.OrgId}</span></div>
          })
        }
      </div>
    </div>
  );
}



export default App;
