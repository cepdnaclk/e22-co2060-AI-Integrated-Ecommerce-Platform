import SellerOfferCard from "./SellerOfferCard";

const SellerOfferGrid = ({ offers, loading, error }) => {
  if (loading) {
    return (
      <p className="text-blue-400 text-center mt-10">
        Loading offers...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-red-400 text-center mt-10">
        {error}
      </p>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <p className="text-gray-400 text-center mt-10">
        No offers found
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <SellerOfferCard
          key={offer._id}
          offer={offer}
        />
      ))}
    </div>
  );
};

export default SellerOfferGrid;