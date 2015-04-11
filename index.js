import _ from 'highland'

let errorThrower = (err) => {
  console.warn("eee", err)
  throw err
}

let constructor = (mongo) => {
  return {
    pusher: () => {
      let mapper = _.map(function(x) {
        mongo({
          action: 'insert'
        })
        return true
      })
      return mapper
    }
  }
}

export default constructor
