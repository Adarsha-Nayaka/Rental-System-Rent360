"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Range } from "react-date-range";
import { useRouter } from "next/navigation";
import { differenceInDays, eachDayOfInterval } from "date-fns";

import useLoginModal from "@/app/hooks/useLoginModal";
import { SafeListing, SafeReservation, SafeUser } from "@/app/types";

import Container from "@/app/components/Container";
import { categories } from "@/app/components/navbar/Categories";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingInfo from "@/app/components/listings/ListingInfo";
import ListingReservation from "@/app/components/listings/ListingReservation";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: "selection",
};

interface ListingClientProps {
  reservations?: SafeReservation[];
  listing: SafeListing & {
    user: SafeUser;
  };
  currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
  listing,
  reservations = [],
  currentUser,
}) => {
  const loginModal = useLoginModal();
  const router = useRouter();

  const disabledDates = useMemo(() => {
    const dateCount: Record<string, number> = {};

    reservations.forEach((reservation: any) => {
      const start = reservation.startDate ? new Date(reservation.startDate) : new Date();
      const end = reservation.endDate ? new Date(reservation.endDate) : new Date();

      const range = eachDayOfInterval({
        start,
        end,
      });

      range.forEach((date) => {
        const dateString = date.toISOString().split("T")[0]; // Format date to YYYY-MM-DD
        dateCount[dateString] = (dateCount[dateString] || 0) + 1;
      });
    });

    const dates: Date[] = Object.entries(dateCount)
      .filter(([_, count]) => count >= listing.itemCount) // Disable dates only if all items are booked
      .map(([date]) => new Date(date));

    return dates;
  }, [reservations, listing.itemCount]);

  const category = useMemo(() => {
    return categories.find((items) => items.label === listing.category);
  }, [listing.category]);

  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }

    // Check availability
    const start = dateRange.startDate || new Date();
    const end = dateRange.endDate || new Date();

    const range = eachDayOfInterval({ start, end });

    const isAvailable = range.every((date) => {
      const dateString = date.toISOString().split("T")[0];
      const reservedCount = reservations.reduce((count, reservation) => {
        const reservationStart = reservation.startDate ? new Date(reservation.startDate) : new Date();
        const reservationEnd = reservation.endDate ? new Date(reservation.endDate) : new Date();

        const reservationRange = eachDayOfInterval({
          start: reservationStart,
          end: reservationEnd,
        });

        return reservationRange.some(
          (reservedDate) =>
            reservedDate.toISOString().split("T")[0] === dateString
        )
          ? count + 1
          : count;
      }, 0);

      return reservedCount < listing.itemCount;
    });

    if (!isAvailable) {
      toast.error("Selected dates are unavailable for the requested quantity.");
      return;
    }

    setIsLoading(true);

    axios
      .post("/api/reservations", {
        totalPrice,
        startDate: start,
        endDate: end,
        listingId: listing?.id,
      })
      .then(() => {
        toast.success("Listing reserved!");
        setDateRange(initialDateRange);
        router.push("/bookings");
      })
      .catch(() => {
        toast.error("Something went wrong.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [totalPrice, dateRange, listing?.id, reservations, listing.itemCount, router, currentUser, loginModal]);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const dayCount = differenceInDays(dateRange.endDate, dateRange.startDate);

      if (listing.price) {
        setTotalPrice((dayCount + 1) * listing.price);
      }
    }
  }, [dateRange, listing.price]);

  return (
    <Container>
      <div
        className="
          max-w-screen-lg 
          mx-auto
        "
      >
        <div className="flex flex-col gap-6">
          <ListingHead
            title={listing.title}
            imageSrc={listing.imageSrc}
            locationValue={listing.locationValue}
            id={listing.id}
            currentUser={currentUser}
          />
          <div
            className="
              grid 
              grid-cols-1 
              md:grid-cols-7 
              md:gap-10 
              mt-6
            "
          >
            <ListingInfo
              user={listing.user}
              category={category}
              description={listing.description}
              itemCount={listing.itemCount}
              securityDeposit={listing.securityDeposit}
              locationValue={listing.locationValue}
            />
            <div
              className="
                order-first 
                mb-10 
                md:order-last 
                md:col-span-3
              "
            >
              <ListingReservation
                price={listing.price}
                totalPrice={totalPrice}
                onChangeDate={(value) => setDateRange(value)}
                dateRange={dateRange}
                onSubmit={onCreateReservation}
                disabled={isLoading}
                disabledDates={disabledDates}
                securityDeposit={listing.securityDeposit}
              />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ListingClient;