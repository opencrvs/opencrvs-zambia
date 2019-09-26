import fetch from 'node-fetch'

const body = {
  child: {
    // Required!
    first_names_en: 'Import',
    last_name_en: 'Test', // Required!
    first_names_bn: 'ঞমড়গপট',
    last_name_bn: 'ঠডুট', // Required!
    sex: 'male'
  },
  father: {
    first_names_en: 'Dad',
    last_name_en: 'Test',
    first_names_bn: 'ঠডুট',
    last_name_bn: 'ঠডুট',
    nid: '9876543210123'
  },
  mother: {
    first_names_en: 'Mom',
    last_name_en: 'Test',
    first_names_bn: 'ঠডুট',
    last_name_bn: 'ঠডুট',
    nid: '1234567890123'
  },
  permanent_address: {
    division: {
      id: '3', // These ids must match BBS codes
      name: 'Dhaka'
    },
    district: {
      id: '29', // These ids must match BBS codes
      name: 'Narsingdi'
    },
    upazila: {
      id: '229', // These ids must match BBS codes
      name: 'Narsingdi'
    },
    city_corporation: {
      id: '', // These ids must match BBS codes
      name: ''
    },
    municipality: {
      id: '200', // These ids must match BBS codes
      name: 'Narsingdi Pourushoba'
    },
    ward: {
      id: '1', // These ids must match BBS codes
      name: 'Urban Ward No-04'
    },
    union: {
      // Required!
      id: '4143', // These ids must match BBS codes
      name: 'Alokbali'
    }
  },
  phone_number: '+88071111111', // Required!
  date_birth: '1565097042000', // Required!
  place_of_birth: {
    id: '1', // These ids must match Central HRIS MoHFW APU Facility List ids for institution
    name: 'Charmadhabpur(bakharnagar) Cc - Narsingdi Sadar'
  },
  union_birth_ocurred: {
    // Required!
    id: '1', // These ids must match BBS codes
    name: 'Alokbali'
  }
}
;(async () => {
  const authRes = await fetch('http://localhost:4040/authenticate', {
    method: 'POST',
    body: JSON.stringify({
      username: 'test',
      password: 'test'
    })
  })

  const authResBody = await authRes.json()

  // tslint:disable-next-line:no-console
  console.log(authResBody)

  const res = await fetch('http://localhost:8040/notification/birth', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Authorization: authResBody.token
    }
  })

  const resBody = await res.json()

  // tslint:disable-next-line:no-console
  console.log(`${res.statusText} - ${res.status}`)
  // tslint:disable-next-line:no-console
  console.log(resBody)
})().catch(err => {
  // tslint:disable-next-line:no-console
  console.log(err)
  process.exit(1)
})
