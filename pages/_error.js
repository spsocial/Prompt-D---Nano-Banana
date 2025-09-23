function Error({ statusCode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🍌</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {statusCode
              ? `เกิดข้อผิดพลาด ${statusCode}`
              : 'เกิดข้อผิดพลาดฝั่ง Client'}
          </h1>
          <p className="text-gray-600 mb-6">
            {statusCode === 404
              ? 'ไม่พบหน้าที่คุณต้องการ'
              : 'มีบางอย่างผิดปกติ กรุณาลองใหม่อีกครั้ง'}
          </p>
          <a
            href="/"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            กลับหน้าหลัก
          </a>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error